import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichPropertyData } from "@/lib/gemini";
import { sendCompletionEmail } from "@/lib/email";

/**
 * ===============================================================================
 * PROPERTY PROCESSING API ROUTE
 * ===============================================================================
 *
 * This API route handles the complete property processing workflow:
 * 1. Batch management (smaller batches for serverless environment)
 * 2. Database operations (individual clients to avoid connection limits)
 * 3. Error handling and retry coordination
 * 4. Progress tracking and logging
 * 5. Email notifications on completion
 *
 * ARCHITECTURE:
 * - Uses enrichPropertyData() from lib/gemini.ts for individual AI requests
 * - Handles all business logic, database access, and user notifications
 * - Implements smaller batches with individual database clients for Vercel
 * - Each property gets up to 3 retry attempts (handled in gemini.ts)
 * ===============================================================================
 */

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

  // Smaller batch size for serverless environment to avoid connection limits
  const batchSize = 10;

  // Function to check if property already exists with individual client
  async function propertyExists(propertyName: string): Promise<boolean> {
    let supabase;
    try {
      // Create individual client for this operation
      supabase = await createClient();
      const { data, error } = await supabase
        .from("properties")
        .select("id")
        .eq("property_address", propertyName)
        .limit(1);

      if (error) {
        console.error("Error checking property existence:", error);
        return false; // If we can't check, proceed with processing
      }

      return data && data.length > 0;
    } catch (error) {
      console.error("Error checking property existence:", error);
      return false; // If we can't check, proceed with processing
    }
  }

  // Function to process a single property with enhanced error handling and retry logic
  async function processSingleProperty(
    propertyName: string,
    requestIndex: number
  ): Promise<"processed" | "skipped" | "failed"> {
    let supabase;
    try {
      // Check if property already exists
      const exists = await propertyExists(propertyName);
      if (exists) {
        skippedProperties.push(propertyName);
        return "skipped";
      }

      console.log(`[${requestIndex + 1}] Processing property: ${propertyName}`);

      // Call enrichPropertyData which now has built-in retry logic (3 attempts)
      const enrichedData = await enrichPropertyData(
        propertyName,
        parentAddress
      );

      // Validate that we have some useful data before inserting
      const hasUsefulData = Object.keys(enrichedData).some(
        (key) => enrichedData[key] && enrichedData[key].trim().length > 0
      );

      if (!hasUsefulData) {
        console.log(
          `[${
            requestIndex + 1
          }] No useful data found for ${propertyName}, inserting with minimal info`
        );
      }

      // Create individual client for insertion
      supabase = await createClient();

      // Insert into properties table with correct schema
      const { error: insertError } = await supabase.from("properties").insert({
        property_address: propertyName, // Store only the property name
        zip_code: enrichedData.zip_code || null,
        city: enrichedData.city || null,
        county: enrichedData.county || null,
        state: enrichedData.state || null,
        decision_maker_name: enrichedData.decision_maker_name || null,
        decision_maker_email: enrichedData.email || null,
        decision_maker_phone: enrichedData.phone || null,
        hoa_or_management_company: enrichedData.management_company || null,
      });

      if (insertError) {
        console.error(
          `[${requestIndex + 1}] Error inserting property ${propertyName}:`,
          insertError
        );
        failedProperties.push(propertyName);
        return "failed";
      } else {
        console.log(
          `[${
            requestIndex + 1
          }] ✅ Successfully processed property: ${propertyName}`
        );
        return "processed";
      }
    } catch (error) {
      console.error(
        `[${requestIndex + 1}] ❌ Error processing property ${propertyName}:`,
        error
      );
      failedProperties.push(propertyName);
      return "failed";
    }
  }

  try {
    console.log(
      `🚀 Starting serverless batch processing of ${properties.length} properties`
    );
    console.log(
      `📊 Batch size: ${batchSize} properties per batch (optimized for Vercel)`
    );

    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(properties.length / batchSize);

      console.log(
        `\n🔄 Processing batch ${batchNumber}/${totalBatches}: ${batch.length} properties`
      );
      console.log(`Properties in this batch: ${batch.join(", ")}`);

      // Start batch processing timestamp
      const batchStartTime = Date.now();

      // Process all properties in the batch simultaneously (each with individual DB clients)
      const batchPromises = batch.map((propertyName, index) =>
        processSingleProperty(propertyName, i + index)
      );

      console.log(`🚦 Starting ${batch.length} simultaneous requests...`);
      const batchResults = await Promise.all(batchPromises);

      // Calculate actual batch time
      const batchEndTime = Date.now();
      const actualBatchTime = Math.round(
        (batchEndTime - batchStartTime) / 1000
      );

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

      console.log(
        `✅ Batch ${batchNumber} completed in ${actualBatchTime} seconds:`
      );
      console.log(`   - Processed: ${successfulInBatch}`);
      console.log(`   - Skipped: ${skippedInBatch}`);
      console.log(`   - Failed: ${failedInBatch}`);
      console.log(
        `📈 Total progress: ${processedCount + skippedCount}/${
          properties.length
        } (${Math.round(
          ((processedCount + skippedCount) / properties.length) * 100
        )}%)`
      );

      // Add delay between batches to ensure we don't overwhelm the API/database
      if (i + batchSize < properties.length) {
        const delayTime = 5000; // 5 seconds between batches for smaller batches
        console.log(
          `⏸️  Waiting ${
            delayTime / 1000
          } seconds before starting next batch...`
        );
        await delay(delayTime);
      }
    }

    const totalFailed = failedProperties.length;
    console.log(`\n🎯 Serverless batch processing completed!`);
    console.log(`📊 Final results:`);
    console.log(`   - Total properties: ${properties.length}`);
    console.log(`   - Successfully processed: ${processedCount}`);
    console.log(`   - Skipped (duplicates): ${skippedCount}`);
    console.log(`   - Failed (after retries): ${totalFailed}`);

    if (failedProperties.length > 0) {
      console.log(
        `❌ Failed properties (after 3 retry attempts each): ${failedProperties.join(
          ", "
        )}`
      );
    }

    // Send completion email with comprehensive results
    await sendCompletionEmail(
      userEmail,
      properties.length,
      processedCount,
      skippedCount,
      skippedProperties
    );

    console.log(`📧 Completion email sent to ${userEmail}`);
  } catch (error) {
    console.error("💥 Error in async processing:", error);

    // Send error notification email
    try {
      await sendCompletionEmail(
        userEmail,
        properties.length,
        processedCount,
        skippedCount,
        skippedProperties
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

    // Process properties asynchronously
    processPropertiesAsync(properties, parentAddress, user.email!);

    return NextResponse.json({
      message: "Processing started",
      total: properties.length,
    });
  } catch (error) {
    console.error("Error in process-properties API:", error);
    return NextResponse.json(
      { error: "Failed to start processing" },
      { status: 500 }
    );
  }
}
