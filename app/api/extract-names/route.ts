import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { extractNamesFromImage } from "@/lib/gemini"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const image = formData.get("image") as File

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 })
    }

    // Validate file type
    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type. Please upload an image." }, { status: 400 })
    }

    // Validate file size (max 10MB)
    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 400 })
    }

    // Convert file to buffer
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Extract names using Gemini Vision
    const names = await extractNamesFromImage(buffer, image.type)

    return NextResponse.json({ names })
  } catch (error) {
    console.error("Error in extract-names API:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to extract names from image",
      },
      { status: 500 },
    )
  }
}
