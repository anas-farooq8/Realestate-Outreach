import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { enrichPropertyData } from "@/lib/gemini"
import { sendCompletionEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { properties, parentAddress, filename } = await request.json()

    if (!properties || !Array.isArray(properties) || properties.length === 0) {
      return NextResponse.json({ error: "Properties array is required" }, { status: 400 })
    }

    if (!parentAddress) {
      return NextResponse.json({ error: "Parent address is required" }, { status: 400 })
    }

    // Create upload record
    const { data: uploadRecord, error: uploadError } = await supabase
      .from("uploads")
      .insert({
        filename,
        parent_address: parentAddress,
        extracted_names: properties,
        total_properties: properties.length,
        processed_properties: 0,
        status: "processing",
      })
      .select()
      .single()

    if (uploadError) {
      throw uploadError
    }

    // Process properties asynchronously
    processPropertiesAsync(properties, parentAddress, user.email!, uploadRecord.id, supabase)

    return NextResponse.json({
      message: "Processing started",
      uploadId: uploadRecord.id,
    })
  } catch (error) {
    console.error("Error in process-properties API:", error)
    return NextResponse.json({ error: "Failed to start processing" }, { status: 500 })
  }
}

async function processPropertiesAsync(
  properties: string[],
  parentAddress: string,
  userEmail: string,
  uploadId: string,
  supabase: any,
) {
  let processedCount = 0
  const batchSize = 3 // Process in smaller batches to avoid rate limits
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  try {
    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize)

      // Process batch with delay between requests
      for (const propertyName of batch) {
        try {
          // Add delay to respect rate limits
          if (processedCount > 0) {
            await delay(3000) // 3 second delay between requests
          }

          const enrichedData = await enrichPropertyData(propertyName, parentAddress)

          // Insert into properties table
          const { error: insertError } = await supabase.from("properties").insert({
            community_name: propertyName,
            management_company: enrichedData.management_company,
            decision_maker_name: enrichedData.decision_maker_name,
            email: enrichedData.email,
            phone: enrichedData.phone,
            street_address: enrichedData.street_address,
            city: enrichedData.city,
            county: enrichedData.county,
            state: enrichedData.state,
            zip_code: enrichedData.zip_code,
            parent_address: parentAddress,
          })

          if (insertError) {
            console.error("Error inserting property:", insertError)
          } else {
            processedCount++
          }

          // Update progress
          await supabase.from("uploads").update({ processed_properties: processedCount }).eq("id", uploadId)
        } catch (error) {
          console.error(`Error processing property ${propertyName}:`, error)
          // Continue processing other properties even if one fails
        }
      }
    }

    // Mark as completed
    await supabase
      .from("uploads")
      .update({
        status: "completed",
        processed_properties: processedCount,
      })
      .eq("id", uploadId)

    // Send completion email
    await sendCompletionEmail(userEmail, properties.length, processedCount)
  } catch (error) {
    console.error("Error in async processing:", error)

    // Mark as failed
    await supabase
      .from("uploads")
      .update({
        status: "failed",
        processed_properties: processedCount,
      })
      .eq("id", uploadId)
  }
}
