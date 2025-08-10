import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function extractNamesFromImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<string[]> {
  try {
    console.log("Starting name extraction from image using Gemini Pro...");

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      generationConfig: {
        temperature: 0.5, // Lower temperature for more consistent extraction
        topK: 40,
        topP: 0.95,
      },
    });

    const prompt = `
      You are an expert at analyzing real estate images. Carefully examine this image and extract ALL visible property/community names.

      EXTRACTION RULES:
      1. Look for any text that represents a property, community, or subdivision name
      2. Include HOA communities, apartment complexes, condominiums, townhomes, subdivisions
      3. Extract the COMPLETE name as it appears (e.g., "CHASEWOOD APARTMENTS", "SUNSET VILLAGE HOA")
      4. Return names in UPPERCASE format
      5. Remove exact duplicates only
      6. Do NOT include street addresses, just property/community names
      7. Look carefully at signs, building facades, entrance markers, and any visible text

      IMPORTANT: Return ONLY a valid JSON array of strings, nothing else.
      Example format: ["CHASEWOOD APARTMENTS", "SUNSET VILLAGE", "OAKWOOD ESTATES"]
      
      If no property names are visible, return: []
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

    // Clean and parse the response
    let cleanedText = text
      .trim()
      .replace(/```json\s*|\s*```/g, "")
      .replace(/```\s*|\s*```/g, "")
      .replace(/^[^[\{]*/, "") // Remove any text before JSON starts
      .replace(/[^}\]]*$/, ""); // Remove any text after JSON ends

    // Extract JSON array if embedded in text
    const jsonMatch = cleanedText.match(/\[[\s\S]*?\]/);
    if (jsonMatch) cleanedText = jsonMatch[0];

    try {
      const names = JSON.parse(cleanedText);
      if (Array.isArray(names)) {
        const uniqueNames = [
          ...new Set(names.map((name) => String(name).trim().toUpperCase())),
        ].filter((name) => name.length > 0 && name.length < 100); // Reasonable length filter

        return uniqueNames;
      }
    } catch (parseError) {
      console.error(
        "JSON parsing failed, trying manual extraction:",
        parseError
      );

      // Fallback: Manual extraction
      const lines = text
        .split(/[\n,]/)
        .map((line) =>
          line
            .trim()
            .replace(/["[\],{}]/g, "")
            .replace(/^\d+\.?\s*/, "") // Remove numbering
            .trim()
        )
        .filter(
          (line) =>
            line &&
            line.length > 2 &&
            line.length < 100 &&
            !line.toLowerCase().includes("no property") &&
            !line.toLowerCase().includes("not found") &&
            !line.toLowerCase().includes("unable")
        );

      if (lines.length > 0) {
        const uniqueNames = [
          ...new Set(lines.map((name) => name.toUpperCase())),
        ];
        return uniqueNames;
      }
    }
    return [];
  } catch (error) {
    console.error("Error extracting names from image:", error);
    throw new Error(
      `Failed to extract names from image: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  } finally {
    console.log("Name extraction completed");
  }
}

/**
 * Enriches property/community info using Gemini Flash with Google Search.
 * Using Flash model for cost efficiency with web search capabilities.
 * Includes retry mechanism for failed requests.
 */
export async function enrichPropertyData(
  propertyName: string,
  parentAddress: string,
  retryCount: number = 0,
  maxRetries: number = 3
): Promise<Record<string, string>> {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      // Temporarily remove tools to test basic connectivity
      // tools: [{ googleSearch: {} } as any],
      generationConfig: {
        temperature: 0.5, // Low temperature for factual data
        topK: 40,
        topP: 0.95,
      },
    });

    const searchQuery = `"${propertyName}" property management HOA contact "${parentAddress}"`;

    const prompt = `
      You are a real estate data enrichment specialist. Find information about "${propertyName}" located near "${parentAddress}".

      Please provide any available information in the following JSON format:
      {
        "management_company": "Company name if found",
        "decision_maker_name": "Contact person name if found",
        "email": "Email if found",
        "phone": "Phone if found", 
        "city": "City name if found",
        "county": "County name if found",
        "state": "State name if found",
        "zip_code": "ZIP code if found"
      }

      Only include fields where you have information. Return ONLY the JSON object.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean the response
    let cleanedText = text
      .trim()
      .replace(/```json\s*|\s*```/g, "")
      .replace(/```\s*|\s*```/g, "")
      .replace(/^[^{]*/, "") // Remove text before JSON
      .replace(/[^}]*$/, ""); // Remove text after JSON

    // Extract JSON object
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleanedText = jsonMatch[0];

    try {
      const enrichedData = JSON.parse(cleanedText);
      return enrichedData || {};
    } catch (parseError) {
      console.error(`JSON parsing failed for ${propertyName}:`, parseError);
      return {};
    }
  } catch (error) {
    console.error(`Error enriching property data for ${propertyName}:`, error);
    return {};
  }
}
