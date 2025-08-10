import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichPropertyData } from "@/lib/gemini";
import { sendCompletionEmail } from "@/lib/email";
import {
  canProcessProperties,
  incrementProcessPropertiesRequests,
  getRequestStats,
} from "@/lib/request-tracker";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function processPropertiesAsync(
  properties: string[],
  parentAddress: string,
  userEmail: string
) {
  let processedCount = 0;
  let skippedCount = 0;
  const skippedProperties: string[] = [];
  const failedProperties: string[] = [];

  // Optimized batch size for better performance
  const batchSize = 50;

  // Function to check if property already exists with individual client
  async function propertyExists(propertyName: string): Promise<boolean> {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("properties")
        .select("id")
        .eq("property_address", propertyName)
        .limit(1);

      if (error) {
        console.error(
          `Error checking property existence for ${propertyName}:`,
          error
        );
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error(
        `Exception checking property existence for ${propertyName}:`,
        error
      );
      return false;
    }
  }

  // Function to process a single property
  async function processSingleProperty(
    propertyName: string,
    requestIndex: number
  ): Promise<"processed" | "skipped" | "failed"> {
    try {
      // Check if property already exists
      const exists = await propertyExists(propertyName);
      if (exists) {
        skippedProperties.push(propertyName);
        return "skipped";
      }

      // Call Gemini API for property enrichment
      const enrichedData = await enrichPropertyData(
        propertyName,
        parentAddress
      );

      // Create individual client for insertion
      const supabase = await createClient();

      // Insert into properties table
      const { error: insertError } = await supabase.from("properties").insert({
        property_address: propertyName,
        city: enrichedData.city || null,
        county: enrichedData.county || null,
        state: enrichedData.state || null,
        zip_code: enrichedData.zip_code || null,
        decision_maker_name: enrichedData.decision_maker_name || null,
        decision_maker_email: enrichedData.email || null,
        decision_maker_phone: enrichedData.phone || null,
        hoa_or_management_company: enrichedData.management_company || null,
      });

      if (insertError) {
        console.error(
          `Database insertion failed for ${propertyName}:`,
          insertError
        );
        failedProperties.push(propertyName);
        return "failed";
      } else {
        return "processed";
      }
    } catch (error) {
      console.error(`Error processing ${propertyName}:`, error);
      failedProperties.push(propertyName);
      return "failed";
    }
  }

  try {
    console.log(
      `🚀 Starting batch processing of ${properties.length} properties`
    );

    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(properties.length / batchSize);

      console.log(
        `\n🔄 Processing batch ${batchNumber}/${totalBatches}: ${batch.length} properties`
      );

      const batchStartTime = Date.now();

      // Process ALL properties in this batch in PARALLEL
      const batchPromises = batch.map((propertyName, index) =>
        processSingleProperty(propertyName, i + index)
      );

      // Wait for ALL properties in this batch to complete
      const batchResults = await Promise.all(batchPromises);

      const batchEndTime = Date.now();
      const batchTime = Math.round((batchEndTime - batchStartTime) / 1000);

      // Count results
      const successfulInBatch = batchResults.filter(
        (result) => result === "processed"
      ).length;
      const skippedInBatch = batchResults.filter(
        (result) => result === "skipped"
      ).length;
      const failedInBatch = batchResults.filter(
        (result) => result === "failed"
      ).length;

      processedCount += successfulInBatch;
      skippedCount += skippedInBatch;

      // Update request count for successful Gemini API calls in this batch
      if (successfulInBatch > 0) {
        const incrementSuccess = await incrementProcessPropertiesRequests(
          successfulInBatch
        );
        if (!incrementSuccess) {
          console.warn(
            `Failed to increment request count for batch ${batchNumber}`
          );
        }
      }

      console.log(
        `✅ Batch ${batchNumber} completed in ${batchTime}s - Processed: ${successfulInBatch}, Skipped: ${skippedInBatch}, Failed: ${failedInBatch}`
      );
      console.log(
        `📈 Total progress: ${processedCount + skippedCount}/${
          properties.length
        } (${Math.round(
          ((processedCount + skippedCount) / properties.length) * 100
        )}%)`
      );

      // Wait 5 seconds between batches (if not the last batch)
      if (i + batchSize < properties.length) {
        console.log(`⏸️ Waiting 5 seconds before next batch...`);
        await delay(5000);
      }
    }

    const totalFailed = failedProperties.length;
    console.log(`\n🎯 Processing completed!`);
    console.log(
      `📊 Final results: ${processedCount} processed, ${skippedCount} skipped, ${totalFailed} failed`
    );

    if (failedProperties.length > 0) {
      console.log(`❌ Failed properties: ${failedProperties.join(", ")}`);
    }

    // Send completion email
    await sendCompletionEmail(
      userEmail,
      properties.length,
      processedCount,
      skippedCount
    );

    console.log(`📧 Completion email sent to ${userEmail}`);
  } catch (error) {
    console.error("💥 Error in processing:", error);

    // Send error notification email
    try {
      await sendCompletionEmail(
        userEmail,
        properties.length,
        processedCount,
        skippedCount
      );
    } catch (emailError) {
      console.error("Failed to send error notification email:", emailError);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { properties, parentAddress, filename } = await request.json();

    if (!properties || !Array.isArray(properties) || properties.length === 0) {
      return NextResponse.json(
        { error: "Properties array is required" },
        { status: 400 }
      );
    }

    if (!parentAddress) {
      return NextResponse.json(
        { error: "Parent address is required" },
        { status: 400 }
      );
    }

    // Check if we can make all the required requests within daily limit
    const requestCount = properties.length; // Each property = 1 Gemini API call
    const canProceed = await canProcessProperties(requestCount);
    if (!canProceed) {
      const stats = await getRequestStats();
      return NextResponse.json(
        {
          error: "Daily request limit exceeded",
          details: `Processing ${requestCount} properties would exceed the daily limit of ${
            stats?.limit || 1500
          } requests. Current usage: ${stats?.used || 0}/${
            stats?.limit || 1500
          }. Limit resets at midnight UTC.`,
          requestsNeeded: requestCount,
          currentUsage: stats?.used || 0,
          remainingRequests: stats?.remaining || 0,
          resetTime: stats?.resetTime || null,
        },
        { status: 429 }
      );
    }

    console.log(`🎬 Starting processing for ${properties.length} properties`);

    // Start processing in the background (fire-and-forget)
    processPropertiesAsync(properties, parentAddress, user.email!).catch(
      (error) => {
        console.error("🚨 Background processing error:", error);
      }
    );

    // Return immediate response to user
    return NextResponse.json({
      message: "Processing started successfully",
      total: properties.length,
      status: "processing",
    });
  } catch (error) {
    console.error("💥 Error in process-properties API:", error);
    return NextResponse.json(
      { error: "Failed to start processing" },
      { status: 500 }
    );
  }
}
