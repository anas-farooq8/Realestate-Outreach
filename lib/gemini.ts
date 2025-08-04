import { GoogleGenerativeAI } from "@google/generative-ai"

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is required")
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export async function extractNamesFromImage(imageBuffer: Buffer, mimeType: string): Promise<string[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

    const prompt = `
      Analyze this image and extract all residential community names, subdivision names, or neighborhood names that you can see.
      
      IMPORTANT RULES:
      1. Extract ONLY the property/community name (e.g., "CHASEWOOD", "SUNSET VILLAGE", "PALM GARDENS")
      2. Do NOT include any additional text like "Estates", "Community", "Subdivision" unless it's part of the actual name
      3. Remove duplicates - each name should appear only once
      4. Return names in UPPERCASE format
      5. Ignore street names, city names, or other non-community identifiers
      6. Clean up any formatting issues
      
      Return the results as a JSON array of strings, like this:
      ["CHASEWOOD", "SUNSET VILLAGE", "PALM GARDENS"]
      
      Return only the JSON array, no other text.
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
        // Remove duplicates and clean names
        const uniqueNames = [...new Set(names.filter((name) => typeof name === "string" && name.trim().length > 0))]
        return uniqueNames.map((name) => name.trim().toUpperCase())
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
        // Remove duplicates and clean names
        const uniqueNames = [...new Set(lines)]
        return uniqueNames.map((name) => name.trim().toUpperCase())
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

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
        "management_company": "Company Name",
        "decision_maker_name": "Full Name",
        "email": "email@example.com",
        "phone": "phone number",
        "street_address": "street address",
        "city": "city name",
        "county": "county name only (no 'County' word)",
        "state": "full state name (e.g., Florida, not FL)",
        "zip_code": "zip code"
      }

      IMPORTANT RULES:
      1. For state: Use full state name (e.g., "Florida", "California", "Texas")
      2. For county: Use only the county name without the word "County" (e.g., "Palm Beach", not "Palm Beach County")
      3. If any field cannot be found, simply omit that field from the JSON response
      4. Ensure email addresses are valid format
      5. Include area codes for phone numbers
      6. Be as accurate as possible with the information
      7. Return only the JSON object, no other text
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    try {
      let cleanedText = text.trim()
      cleanedText = cleanedText.replace(/```json\n?|\n?```/g, "")
      cleanedText = cleanedText.replace(/```\n?|\n?```/g, "")

      const data = JSON.parse(cleanedText)

      // Only return fields that have actual values
      const result: any = {}

      if (data.management_company) result.management_company = data.management_company
      if (data.decision_maker_name) result.decision_maker_name = data.decision_maker_name
      if (data.email) result.email = data.email
      if (data.phone) result.phone = data.phone
      if (data.street_address) result.street_address = data.street_address
      if (data.city) result.city = data.city
      if (data.county) result.county = data.county
      if (data.state) result.state = data.state
      if (data.zip_code) result.zip_code = data.zip_code

      return result
    } catch (parseError) {
      console.error("Failed to parse enrichment response:", parseError)
      console.log("Raw response:", text)

      // Return empty object if parsing fails
      return {}
    }
  } catch (error) {
    console.error("Error enriching property data:", error)

    // Return empty object instead of throwing error to prevent processing failure
    return {}
  }
}
