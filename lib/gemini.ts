import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Rate limiting
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Extracts property/community names from an image using Gemini (no web search).
 */
export async function extractNamesFromImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<string[]> {
  try {
    console.log("Starting name extraction from image...");

    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    });

    const prompt = `
      Analyze this image and extract ALL property/community names visible in the image.

      IMPORTANT RULES:
      1. Extract ONLY the property/community name (e.g., "CHASEWOOD", "SUNSET VILLAGE")
      2. Remove duplicates - each name should appear only once
      3. Return names in UPPERCASE format
      4. Do not include addresses, just the property names
      5. If you see apartment complex names, HOA community names, or subdivision names, include them
      6. Look for any text that represents a property or community name

      Return the names as a JSON array of strings.
      Example: ["CHASEWOOD", "SUNSET VILLAGE", "OAKWOOD ESTATES"]

      If no property names are found, return an empty array: []
    `;

    const imagePart = {
      inlineData: {
        data: imageBuffer.toString("base64"),
        mimeType: mimeType,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    console.log("Raw Gemini response:", text);

    let cleanedText = text
      .trim()
      .replace(/```json\s*|\s*```/g, "")
      .replace(/```\s*|\s*```/g, "");

    const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
    if (jsonMatch) cleanedText = jsonMatch[0];

    try {
      const names = JSON.parse(cleanedText);
      if (Array.isArray(names)) {
        const uniqueNames = [
          ...new Set(names.map((name) => String(name).trim().toUpperCase())),
        ].filter((name) => name.length > 0);

        console.log("Extracted names:", uniqueNames);
        return uniqueNames;
      }
    } catch (parseError) {
      console.error(
        "JSON parsing failed, trying to extract names manually:",
        parseError
      );
      const lines = cleanedText.split("\n");
      const extractedNames: string[] = [];

      for (const line of lines) {
        const trimmed = line
          .trim()
          .replace(/["[\],]/g, "")
          .trim();
        if (
          trimmed &&
          trimmed.length > 2 &&
          !trimmed.toLowerCase().includes("no property")
        ) {
          extractedNames.push(trimmed.toUpperCase());
        }
      }

      if (extractedNames.length > 0) {
        const uniqueNames = [...new Set(extractedNames)];
        console.log("Manually extracted names:", uniqueNames);
        return uniqueNames;
      }
    }

    console.log("No names could be extracted from the response");
    return [];
  } catch (error) {
    console.error("Error extracting names from image:", error);
    throw new Error("Failed to extract names from image");
  }
}

/**
 * Enriches property/community info using Google Search + Gemini (grounded).
 */
export async function enrichPropertyData(
  propertyName: string,
  parentAddress: string
): Promise<Record<string, string>> {
  try {
    console.log(`Enriching data for property: ${propertyName}`);

    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      tools: [{ googleSearch: {} } as any],
    });

    const prompt = `
      You are a real estate data enrichment expert. For the property "${propertyName}" located near "${parentAddress}", provide the following information in JSON format:

      IMPORTANT FORMATTING RULES:
      1. For state: Use full state name (e.g., "Florida", not "FL")
      2. For county: Use only county name without "County" word (e.g., "Miami-Dade", not "Miami-Dade County")
      3. If any data is not found or uncertain, omit that field entirely from the JSON
      4. Do not use "unknown", "N/A", or similar placeholder values
      5. Only include fields where you have confident data

      Required JSON structure (only include fields with actual data):
      {
        "management_company": "Company name if found",
        "decision_maker_name": "Name if found",
        "email": "email@domain.com if found",
        "phone": "phone number if found",
        "street": "street address if found",
        "city": "city name if found",
        "county": "county name only (no 'County' word)",
        "state": "full state name",
        "zip_code": "zip code if found"
      }

      Focus on finding:
      - HOA management companies or property management companies
      - Decision makers (HOA presidents, property managers, etc.)
      - Contact information (emails, phone numbers)
      - Accurate location data

      Return only the JSON object, no additional text.
    `;

    await delay(10000); // 10 seconds between requests

    const result = await model.generateContent(prompt);

    const response = await result.response;
    const text = response.text();

    console.log(`Raw response for ${propertyName}:`, text);

    let cleanedText = text
      .trim()
      .replace(/```json\s*|\s*```/g, "")
      .replace(/```\s*|\s*```/g, "");

    try {
      const enrichedData = JSON.parse(cleanedText);
      console.log(`Enriched data for ${propertyName}:`, enrichedData);
      return enrichedData;
    } catch (parseError) {
      console.error(`JSON parsing failed for ${propertyName}:`, parseError);
      console.log("Raw text that failed to parse:", cleanedText);
      return {};
    }
  } catch (error) {
    console.error("Error enriching property data:", error);
    return {};
  }
}
