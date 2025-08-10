import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Enhanced delay function
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * ===============================================================================
 * GEMINI AI UTILITY FUNCTIONS
 * ===============================================================================
 *
 * This file contains individual AI functions for:
 * 1. Image analysis (extractNamesFromImage) - Uses Gemini Pro
 * 2. Property data enrichment (enrichPropertyData) - Uses Gemini Flash with web search
 *
 * ARCHITECTURE NOTE:
 * - This file handles INDIVIDUAL AI requests only
 * - Batch processing, database operations, and email notifications are handled
 *   in the API routes (app/api/process-properties/route.ts)
 * - This separation ensures clean separation of concerns:
 *   * Gemini file = AI utilities
 *   * API routes = Business logic, batching, database, notifications
 * ===============================================================================
 */

/**
 * Extracts property/community names from an image using Gemini Pro (no web search needed).
 * Using Pro model for better accuracy with image analysis.
 */
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

    console.log("No names could be extracted from the response");
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
    console.log(
      `[Attempt ${retryCount + 1}/${
        maxRetries + 1
      }] Enriching data for property: ${propertyName} near ${parentAddress}`
    );

    // Test basic Gemini connectivity on first attempt
    if (retryCount === 0) {
      console.log(`🧪 Testing Gemini API connectivity...`);
      try {
        const testModel = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
        });
        const testResult = (await Promise.race([
          testModel.generateContent(
            'Say \'Hello\' in JSON format: {"message": "Hello"}'
          ),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Test timeout")), 5000)
          ),
        ])) as any;
        const testResponse = await testResult.response;
        const testText = testResponse.text();
        console.log(
          `✅ Gemini API connectivity test passed: ${testText.substring(
            0,
            100
          )}`
        );
      } catch (testError) {
        console.error(`❌ Gemini API connectivity test failed:`, testError);
        throw new Error(
          `Gemini API connectivity test failed: ${
            testError instanceof Error ? testError.message : "Unknown error"
          }`
        );
      }
    }

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
      You are a real estate data enrichment specialist. Search for information about "${propertyName}" located near "${parentAddress}".

      SEARCH STRATEGY:
      1. Search for: "${searchQuery}"
      2. Look for official property websites, HOA sites, management company pages
      3. Find current contact information and management details

      DATA FORMATTING RULES:
      1. State: Use FULL state name (e.g., "Florida", never "FL")
      2. County: Use county name WITHOUT "County" suffix (e.g., "Miami-Dade", not "Miami-Dade County")
      3. Phone: Format as standard US phone (e.g., "(555) 123-4567")
      4. Email: Must be valid email format
      5. ONLY include fields with VERIFIED data - omit uncertain fields entirely
      6. Do NOT use placeholders like "unknown", "N/A", or similar

      REQUIRED JSON OUTPUT (include only verified fields):
      {
        "management_company": "Verified company name",
        "decision_maker_name": "Verified contact person name",
        "email": "verified@email.com",
        "phone": "(555) 123-4567",
        "city": "Verified city name",
        "county": "Verified county name without 'County'",
        "state": "Full verified state name",
        "zip_code": "Verified ZIP code"
      }

      PRIORITY SEARCH TARGETS:
      - Property management companies
      - HOA management contacts
      - Community association websites
      - Official property directories
      - Contact information for decision makers

      Return ONLY the JSON object with verified data. No additional text or explanations.
    `;

    console.log(`🌐 Making Gemini API call for ${propertyName}...`);

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(`Gemini API timeout after 20 seconds for ${propertyName}`)
        );
      }, 20000); // 20 second timeout
    });

    // Race the API call against timeout
    const result = (await Promise.race([
      model.generateContent(prompt),
      timeoutPromise,
    ])) as any;

    console.log(
      `✅ Gemini API call completed for ${propertyName}, processing response...`
    );

    const response = await result.response;
    const text = response.text();

    console.log(
      `📝 Raw Gemini response for ${propertyName}: ${text.substring(0, 200)}...`
    );

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

      // Validate the data structure
      const validData: Record<string, string> = {};
      const allowedFields = [
        "management_company",
        "decision_maker_name",
        "email",
        "phone",
        "city",
        "county",
        "state",
        "zip_code",
      ];

      for (const [key, value] of Object.entries(enrichedData)) {
        if (
          allowedFields.includes(key) &&
          typeof value === "string" &&
          value.trim()
        ) {
          const trimmedValue = value.trim();
          // Skip placeholder values
          if (
            !trimmedValue.toLowerCase().includes("unknown") &&
            !trimmedValue.toLowerCase().includes("n/a") &&
            !trimmedValue.toLowerCase().includes("not found") &&
            !trimmedValue.toLowerCase().includes("verify")
          ) {
            validData[key] = trimmedValue;
          }
        }
      }

      console.log(
        `✅ [Attempt ${
          retryCount + 1
        }] Successfully enriched data for ${propertyName}:`,
        validData
      );
      return validData;
    } catch (parseError) {
      console.error(
        `❌ [Attempt ${
          retryCount + 1
        }] JSON parsing failed for ${propertyName}:`,
        parseError
      );

      // Retry if we haven't exceeded max retries
      if (retryCount < maxRetries) {
        console.log(
          `🔄 Retrying ${propertyName} (attempt ${retryCount + 2}/${
            maxRetries + 1
          })...`
        );
        await delay(1000); // Wait 1 second before retry
        return enrichPropertyData(
          propertyName,
          parentAddress,
          retryCount + 1,
          maxRetries
        );
      }

      return {};
    }
  } catch (error) {
    console.error(
      `❌ [Attempt ${
        retryCount + 1
      }] Error enriching property data for ${propertyName}:`,
      error
    );

    // Log specific error types for debugging
    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        console.error(
          `⏰ Timeout occurred for ${propertyName} - Gemini API took too long`
        );
      } else if (error.message.includes("quota")) {
        console.error(`🚫 Rate limit exceeded for ${propertyName}`);
      } else if (error.message.includes("authentication")) {
        console.error(`🔑 API key authentication failed for ${propertyName}`);
      } else if (error.message.includes("fetch")) {
        console.error(`🌐 Network error for ${propertyName}`);
      } else {
        console.error(`🔍 Unknown error for ${propertyName}: ${error.message}`);
      }
    }

    // Retry if we haven't exceeded max retries
    if (retryCount < maxRetries) {
      console.log(
        `🔄 Retrying ${propertyName} due to error (attempt ${retryCount + 2}/${
          maxRetries + 1
        })...`
      );
      await delay(2000); // Wait 2 seconds before retry on error
      return enrichPropertyData(
        propertyName,
        parentAddress,
        retryCount + 1,
        maxRetries
      );
    }

    console.error(
      `💥 [Final attempt] Failed to enrich ${propertyName} after ${
        maxRetries + 1
      } attempts`
    );
    return {};
  }
}
