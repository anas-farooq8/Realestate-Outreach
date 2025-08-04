import { GoogleGenerativeAI } from "@google/generative-ai"

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is required")
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export async function extractNamesFromImage(imageBuffer: Buffer, mimeType: string): Promise<string[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

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

    console.log("Gemini response:", text)

    // Try to parse the JSON response
    try {
      // Clean up the response text
      let cleanedText = text.trim()

      // Remove markdown code blocks if present
      cleanedText = cleanedText.replace(/```json\n?|\n?```/g, "")
      cleanedText = cleanedText.replace(/```\n?|\n?```/g, "")

      // Try to find JSON array in the text
      const jsonMatch = cleanedText.match(/\[.*\]/s)
      if (jsonMatch) {
        cleanedText = jsonMatch[0]
      }

      const names = JSON.parse(cleanedText)

      if (Array.isArray(names)) {
        return names.filter((name) => typeof name === "string" && name.trim().length > 0).map((name) => name.trim())
      } else {
        throw new Error("Response is not an array")
      }
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError)
      console.log("Raw response:", text)

      // Fallback: try to extract names from text
      const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => line.replace(/^[-*•]\s*/, ""))
        .map((line) => line.replace(/^\d+\.\s*/, ""))
        .filter((line) => line.length > 0 && !line.includes("JSON") && !line.includes("array"))

      if (lines.length > 0) {
        return lines
      }

      throw new Error("Could not extract property names from the response")
    }
  } catch (error) {
    console.error("Error extracting names from image:", error)
    throw new Error(`Failed to extract property names: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function enrichPropertyData(propertyName: string, parentAddress: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })

    const prompt = `
      You are a real estate research assistant. Find detailed HOA or property management contact information for the residential community "${propertyName}" located in or near "${parentAddress}".

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
      let cleanedText = text.trim()
      cleanedText = cleanedText.replace(/```json\n?|\n?```/g, "")
      cleanedText = cleanedText.replace(/```\n?|\n?```/g, "")

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
      console.log("Raw response:", text)

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
    console.error("Error enriching property data:", error)
    throw new Error(`Failed to enrich data for property: ${propertyName}`)
  }
}
