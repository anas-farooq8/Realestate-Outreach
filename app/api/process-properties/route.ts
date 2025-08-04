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

    // Process properties asynchronously
    processPropertiesAsync(properties, parentAddress, user.email!, supabase)

    return NextResponse.json({
      message: "Processing started",
      total: properties.length,
    })
  } catch (error) {
    console.error("Error in process-properties API:", error)
    return NextResponse.json({ error: "Failed to start processing" }, { status: 500 })
  }
}

async function processPropertiesAsync(properties: string[], parentAddress: string, userEmail: string, supabase: any) {
  let processedCount = 0
  const batchSize = 3
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  try {
    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize)

      for (const propertyName of batch) {
        try {
          if (processedCount > 0) {
            await delay(3000)
          }

          const enrichedData = await enrichPropertyData(propertyName, parentAddress)

          // Insert into properties table with new schema
          const { error: insertError } = await supabase.from("properties").insert({
            property_address: `${propertyName}, ${parentAddress}`,
            street: enrichedData.street_address,
            city: enrichedData.city,
            county: enrichedData.county,
            state: enrichedData.state,
            zip_code: enrichedData.zip_code,
            decision_maker_name: enrichedData.decision_maker_name,
            decision_maker_email: enrichedData.email || `noemail+${Date.now()}@example.com`, // Required field
            decision_maker_phone: enrichedData.phone,
            hoa_or_management_company: enrichedData.management_company,
            suspend_until: new Date().toISOString().split("T")[0], // Today's date
          })

          if (insertError) {
            console.error("Error inserting property:", insertError)
          } else {
            processedCount++
          }
        } catch (error) {
          console.error(`Error processing property ${propertyName}:`, error)
        }
      }
    }

    // Send completion email
    await sendCompletionEmail(userEmail, properties.length, processedCount)
  } catch (error) {
    console.error("Error in async processing:", error)
  }
}
