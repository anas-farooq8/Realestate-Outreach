import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function extractNamesFromImage(imageBuffer: Buffer, mimeType: string): Promise<string[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `
      Analyze this image and extract all residential community names, subdivision names, or neighborhood names that you can see.
      Return only the names as a JSON array of strings, with no additional text or formatting.
      Focus on community names, not individual street addresses.
      Example format: ["Community Name 1", "Community Name 2", "Community Name 3"]
    `

    const imagePart = {
      inlineData: {
        data: imageBuffer.toString("base64"),
        mimeType: mimeType,
      },
    }

    const result = await model.generateContent([prompt, imagePart])
    const response = await result.response
    const text = response.text()

    // Parse JSON response
    try {
      const names = JSON.parse(text.trim())
      return Array.isArray(names) ? names.filter((name) => typeof name === "string" && name.trim()) : []
    } catch {
      // Fallback: extract names from text response
      const lines = text.split("\n").filter((line) => line.trim())
      return lines.map((line) => line.replace(/^[-*•]\s*/, "").trim()).filter(Boolean)
    }
  } catch (error) {
    console.error("Error extracting names from image:", error)
    throw new Error("Failed to extract community names from image")
  }
}

export async function enrichCommunityData(communityName: string, parentAddress: string): Promise<any> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })

    const prompt = `
      Find detailed HOA or property management contact information for the residential community "${communityName}" in ${parentAddress}.
      
      Return the information as a valid JSON object with the following structure:
      {
        "community_name": "${communityName}",
        "management_company": "Company Name or null",
        "decision_maker_name": "Contact Person Name or null",
        "email": "contact@email.com or null",
        "phone": "Phone Number or null",
        "street_address": "Street Address or null",
        "city": "City or null",
        "county": "County or null",
        "state": "State or null",
        "zip_code": "Zip Code or null"
      }
      
      Important guidelines:
      - Only return factual, verifiable information
      - Use null for any fields where you cannot find reliable information
      - Ensure email addresses and phone numbers are properly formatted
      - Focus on HOA management companies, property management firms, or community association contacts
      - Do not make up or guess information
      
      Return only the JSON object, no additional text.
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text().trim()

    try {
      const data = JSON.parse(text)
      return {
        community_name: communityName,
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
      console.error("Error parsing Gemini response:", parseError)
      return {
        community_name: communityName,
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
    return {
      community_name: communityName,
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
}
