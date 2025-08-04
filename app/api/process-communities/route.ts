import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { enrichCommunityData } from "@/lib/gemini"
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

    const { communities, parentAddress, filename } = await request.json()

    if (!communities || !Array.isArray(communities) || communities.length === 0) {
      return NextResponse.json({ error: "Communities array is required" }, { status: 400 })
    }

    if (!parentAddress) {
      return NextResponse.json({ error: "Parent address is required" }, { status: 400 })
    }

    // Create upload record
    const { data: uploadRecord, error: uploadError } = await supabase
      .from("uploads")
      .insert({
        user_id: user.id,
        filename,
        parent_address: parentAddress,
        extracted_names: communities,
        total_communities: communities.length,
        processed_communities: 0,
        status: "processing",
      })
      .select()
      .single()

    if (uploadError) {
      throw uploadError
    }

    // Process communities asynchronously
    processCommunitiesAsync(communities, parentAddress, user.id, user.email!, uploadRecord.id, supabase)

    return NextResponse.json({
      message: "Processing started",
      uploadId: uploadRecord.id,
    })
  } catch (error) {
    console.error("Error in process-communities API:", error)
    return NextResponse.json({ error: "Failed to start processing" }, { status: 500 })
  }
}

async function processCommunitiesAsync(
  communities: string[],
  parentAddress: string,
  userId: string,
  userEmail: string,
  uploadId: string,
  supabase: any,
) {
  let processedCount = 0
  const batchSize = 5 // Process in batches to avoid rate limits
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  try {
    for (let i = 0; i < communities.length; i += batchSize) {
      const batch = communities.slice(i, i + batchSize)

      // Process batch with delay between requests
      for (const communityName of batch) {
        try {
          // Add delay to respect rate limits
          if (processedCount > 0) {
            await delay(2000) // 2 second delay between requests
          }

          const enrichedData = await enrichCommunityData(communityName, parentAddress)

          // Insert into properties table
          const { error: insertError } = await supabase.from("properties").insert({
            user_id: userId,
            community_name: communityName,
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
          await supabase.from("uploads").update({ processed_communities: processedCount }).eq("id", uploadId)
        } catch (error) {
          console.error(`Error processing community ${communityName}:`, error)
          // Continue processing other communities even if one fails
        }
      }
    }

    // Mark as completed
    await supabase
      .from("uploads")
      .update({
        status: "completed",
        processed_communities: processedCount,
      })
      .eq("id", uploadId)

    // Send completion email
    await sendCompletionEmail(userEmail, communities.length, processedCount)
  } catch (error) {
    console.error("Error in async processing:", error)

    // Mark as failed
    await supabase
      .from("uploads")
      .update({
        status: "failed",
        processed_communities: processedCount,
      })
      .eq("id", uploadId)
  }
}
