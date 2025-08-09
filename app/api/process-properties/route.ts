import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichPropertyData } from "@/lib/gemini";
import { sendCompletionEmail } from "@/lib/email";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function processPropertiesAsync(
  properties: string[],
  parentAddress: string,
  userEmail: string,
  supabase: any
) {
  let processedCount = 0;
  let skippedCount = 0;
  const skippedProperties: string[] = [];
  const batchSize = 5; // Process 5 properties at a time

  // Function to check if property already exists
  async function propertyExists(propertyName: string): Promise<boolean> {
    try {
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

  // Function to process a single property
  async function processSingleProperty(
    propertyName: string
  ): Promise<"processed" | "skipped" | "failed"> {
    try {
      // Check if property already exists
      const exists = await propertyExists(propertyName);
      if (exists) {
        console.log(`Property already exists, skipping: ${propertyName}`);
        skippedProperties.push(propertyName);
        return "skipped";
      }

      const enrichedData = await enrichPropertyData(
        propertyName,
        parentAddress
      );

      // Insert into properties table with correct schema
      const { error: insertError } = await supabase.from("properties").insert({
        property_address: propertyName, // Store only the property name
        city: enrichedData.city,
        county: enrichedData.county,
        state: enrichedData.state,
        zip_code: enrichedData.zip_code,
        decision_maker_name: enrichedData.decision_maker_name,
        decision_maker_email: enrichedData.email, // Use email from enriched data or null
        decision_maker_phone: enrichedData.phone,
        hoa_or_management_company: enrichedData.management_company,
      });

      if (insertError) {
        console.error("Error inserting property:", insertError);
        return "failed";
      } else {
        console.log(`Successfully processed property: ${propertyName}`);
        return "processed";
      }
    } catch (error) {
      console.error(`Error processing property ${propertyName}:`, error);
      return "failed";
    }
  }

  try {
    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize);

      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}: ${
          batch.length
        } properties simultaneously`
      );

      // Process all properties in the batch simultaneously
      const batchPromises = batch.map((propertyName) =>
        processSingleProperty(propertyName)
      );
      const batchResults = await Promise.all(batchPromises);

      // Count results
      const successfulInBatch = batchResults.filter(
        (result) => result === "processed"
      ).length;
      const skippedInBatch = batchResults.filter(
        (result) => result === "skipped"
      ).length;

      processedCount += successfulInBatch;
      skippedCount += skippedInBatch;

      console.log(
        `Batch completed: ${successfulInBatch} processed, ${skippedInBatch} skipped, ${
          batch.length - successfulInBatch - skippedInBatch
        } failed`
      );

      // Add delay between batches (10 seconds)
      if (i + batchSize < properties.length) {
        console.log("Waiting 10 seconds before processing next batch...");
        await delay(10000); // 10 seconds between batches
      }
    }

    // Send completion email with skipped count
    await sendCompletionEmail(
      userEmail,
      properties.length,
      processedCount,
      skippedCount,
      skippedProperties
    );
  } catch (error) {
    console.error("Error in async processing:", error);
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
    processPropertiesAsync(properties, parentAddress, user.email!, supabase);

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
