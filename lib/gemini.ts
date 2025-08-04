import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function extractNamesFromImage(imageBuffer: Buffer, mimeType: string): Promise<string[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })

    const prompt = `
      Analyze this image and extract all residential community names, subdivision names, or neighborhood names that you can see.
      
      Return the results as a JSON array of strings, like this:
      ["Community Name 1", "Community Name 2", "Community Name 3"]
      
      Rules:
      - Only extract actual community/subdivision/neighborhood names
      - Ignore street names, city names, or other non-community identifiers
      - Clean up any formatting issues
      - Remove duplicates
      - Return only the JSON array, no other text
    `

    const imagePart = {
      inlineData: {
        data: imageBuffer.toString("base64"),
        mimeType,
      },
    }

    const result = await model.generateContent([prompt, imagePart])
    const response = await result.response
    const text = response.text()

    // Try to parse the JSON response
    try {
      const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim()
      const names = JSON.parse(cleanedText)

      if (Array.isArray(names)) {
        return names.filter((name) => typeof name === "string" && name.trim().length > 0)
      }
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError)
      // Fallback: try to extract names from text
      const lines = text.split("\n").filter((line) => line.trim().length > 0)
      return lines.map((line) => line.replace(/^[-*•]\s*/, "").trim()).filter(Boolean)
    }

    return []
  } catch (error) {
    console.error("Error extracting names from image:", error)
    throw new Error("Failed to extract community names from image")
  }
}

export async function enrichCommunityData(communityName: string, parentAddress: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })

    const prompt = `
      You are a real estate research assistant. Find detailed HOA or property management contact information for the residential community "${communityName}" located in or near "${parentAddress}".

      Search for:
      1. Management company name
      2. Decision maker (Property Manager, HOA President, Community Manager, etc.)
      3. Contact email address
      4. Phone number
      5. Full address (street, city, county, state, zip code)

      Return the information as a JSON object with this exact structure:
      {
        "management_company": "Company Name or null",
        "decision_maker_name": "Full Name or null",
        "email": "email@example.com or null",
        "phone": "phone number or null",
        "street_address": "street address or null",
        "city": "city name or null",
        "county": "county name or null",
        "state": "state name or null",
        "zip_code": "zip code or null"
      }

      Important:
      - Use null for any field you cannot find reliable information for
      - Ensure email addresses are valid format
      - Include area codes for phone numbers
      - Be as accurate as possible with the information
      - Return only the JSON object, no other text
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    try {
      const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim()
      const data = JSON.parse(cleanedText)

      // Ensure all required fields exist
      return {
        management_company: data.management_company || null,
        decision_maker_name: data.decision_maker_name || null,
        email: data.email || null,
        phone: data.phone || null,
        street_address: data.street_address || null,
        city: data.city || null,
        county: data.county || null,
        state: data.state || null,
        zip_code: data.zip_code || null,
      }
    } catch (parseError) {
      console.error("Failed to parse enrichment response:", parseError)
      // Return empty structure if parsing fails
      return {
        management_company: null,
        decision_maker_name: null,
        email: null,
        phone: null,
        street_address: null,
        city: null,
        county: null,
        state: null,
        zip_code: null,
      }
    }
  } catch (error) {
    console.error("Error enriching community data:", error)
    throw new Error(`Failed to enrich data for community: ${communityName}`)
  }
}
