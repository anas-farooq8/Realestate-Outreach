import { type NextRequest, NextResponse } from "next/server"
import { extractNamesFromImage } from "@/lib/gemini"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get("image") as File

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    // Validate file type
    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type. Please upload an image." }, { status: 400 })
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (image.size > maxSize) {
      return NextResponse.json({ error: "File too large. Please upload an image smaller than 10MB." }, { status: 400 })
    }

    // Convert to buffer
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Extract names using Gemini
    const names = await extractNamesFromImage(buffer, image.type)

    return NextResponse.json({ names })
  } catch (error) {
    console.error("Error in extract-names API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to extract names" },
      { status: 500 },
    )
  }
}
