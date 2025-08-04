import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { enrichPropertyData } from "@/lib/gemini"

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function processPropertiesAsync(propertyNames: string[], parentAddress: string) {
  const supabase = await createClient()

  console.log(`Starting to process ${propertyNames.length} properties`)

  const batchSize = 2 // Process 2 properties at a time to avoid rate limits
  const results = []

  for (let i = 0; i < propertyNames.length; i += batchSize) {
    const batch = propertyNames.slice(i, i + batchSize)
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}: ${batch.join(", ")}`)

    const batchPromises = batch.map(async (propertyName) => {
      try {
        console.log(`Processing property: ${propertyName}`)

        // Enrich property data using Gemini
        const enrichedData = await enrichPropertyData(propertyName, parentAddress)

        // Generate unique email if none found
        const uniqueEmail =
          enrichedData.email || `noemail+${Date.now()}+${Math.random().toString(36).substr(2, 9)}@example.com`

        // Check for existing property with same email and name
        const { data: existingProperties } = await supabase
          .from("properties")
          .select("property_address, decision_maker_email")
          .eq("decision_maker_email", uniqueEmail)

        if (existingProperties && existingProperties.length > 0) {
          const existingProperty = existingProperties.find((p) => p.property_address === propertyName)
          if (existingProperty) {
            console.log(`Skipping duplicate property: ${propertyName} with email: ${uniqueEmail}`)
            return { success: true, skipped: true, propertyName }
          }
        }

        // Prepare property data
        const propertyData = {
          property_address: propertyName,
          street: enrichedData.street || null,
          city: enrichedData.city || null,
          county: enrichedData.county || null,
          state: enrichedData.state || null,
          zip_code: enrichedData.zip_code || null,
          decision_maker_name: enrichedData.decision_maker_name || null,
          decision_maker_email: uniqueEmail,
          decision_maker_phone: enrichedData.phone || null,
          hoa_or_management_company: enrichedData.management_company || null,
          suspend_until: new Date().toISOString().split("T")[0], // Today's date
          opt_out_code: crypto.randomUUID(),
        }

        // Insert into database
        const { data, error } = await supabase.from("properties").insert([propertyData]).select()

        if (error) {
          console.error(`Error inserting property ${propertyName}:`, error)
          return { success: false, error: error.message, propertyName }
        }

        console.log(`Successfully processed property: ${propertyName}`)
        return { success: true, data: data[0], propertyName }
      } catch (error) {
        console.error(`Error processing property ${propertyName}:`, error)
        return { success: false, error: error.message, propertyName }
      }
    })

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)

    // Add delay between batches to respect rate limits
    if (i + batchSize < propertyNames.length) {
      console.log("Waiting before processing next batch...")
      await delay(15000) // 15 seconds between batches
    }
  }

  const successful = results.filter((r) => r.success && !r.skipped).length
  const skipped = results.filter((r) => r.skipped).length
  const failed = results.filter((r) => !r.success).length

  console.log(`Processing complete: ${successful} successful, ${skipped} skipped, ${failed} failed`)

  return {
    total: propertyNames.length,
    successful,
    skipped,
    failed,
    results,
  }
}

export async function POST(request: NextRequest) {
  try {
    const { propertyNames, parentAddress } = await request.json()

    if (!propertyNames || !Array.isArray(propertyNames) || propertyNames.length === 0) {
      return NextResponse.json({ error: "Property names are required" }, { status: 400 })
    }

    if (!parentAddress || typeof parentAddress !== "string") {
      return NextResponse.json({ error: "Parent address is required" }, { status: 400 })
    }

    // Start processing asynchronously
    processPropertiesAsync(propertyNames, parentAddress).catch((error) => {
      console.error("Error in async processing:", error)
    })

    return NextResponse.json({
      message: "Processing started",
      total: propertyNames.length,
    })
  } catch (error) {
    console.error("Error in process-properties API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
