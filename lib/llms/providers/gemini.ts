import { GoogleGenAI } from "@google/genai";
import { type GenerateTextResult, type InlineFileInput, LlmProviderError } from "@/lib/llms/types";

function getGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new LlmProviderError("Missing environment variable: GEMINI_API_KEY", "missing_key");
  }

  return apiKey;
}

function shouldRotateModel(code: LlmProviderError["code"]) {
  return code === "quota" || code === "internal" || code === "unavailable" || code === "timeout" || code === "not_found";
}

export function mapGeminiError(error: unknown, model: string) {
  if (error instanceof LlmProviderError) {
    return error;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);

  if (/401|unauthenticated|api key not valid|invalid api key|reported as leaked/i.test(errorMessage)) {
    return new LlmProviderError(errorMessage.slice(0, 400), "authentication", model);
  }

  if (/403|permission_denied|permission denied|doesn't have the required permissions/i.test(errorMessage)) {
    return new LlmProviderError(errorMessage.slice(0, 400), "permission_denied", model);
  }

  if (/404|not_found|model .* not found|requested resource wasn't found/i.test(errorMessage)) {
    return new LlmProviderError(errorMessage.slice(0, 400), "not_found", model);
  }

  if (/429|quota|rate limit|resource exhausted|quota exceeded/i.test(errorMessage)) {
    return new LlmProviderError("Gemini quota exceeded", "quota", model);
  }

  if (/400|invalid_argument|request too large|failed_precondition|free tier is not available/i.test(errorMessage)) {
    return new LlmProviderError(errorMessage.slice(0, 400), "invalid_request", model);
  }

  if (/500|internal/i.test(errorMessage)) {
    return new LlmProviderError(errorMessage.slice(0, 400), "internal", model);
  }

  if (/503|unavailable|overloaded|capacity/i.test(errorMessage)) {
    return new LlmProviderError(errorMessage.slice(0, 400), "unavailable", model);
  }

  if (/504|deadline_exceeded|deadline exceeded|timeout/i.test(errorMessage)) {
    return new LlmProviderError(errorMessage.slice(0, 400), "timeout", model);
  }

  return new LlmProviderError(errorMessage.slice(0, 400), "provider_error", model);
}

export async function generateGeminiText(prompt: string, modelPool: string[], inlineFile?: InlineFileInput): Promise<GenerateTextResult> {
  const client = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  let lastError: LlmProviderError | null = null;

  for (const model of modelPool) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: inlineFile
          ? [
              {
                role: "user",
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: inlineFile.mimeType,
                      data: inlineFile.data,
                    },
                  },
                ],
              },
            ]
          : prompt,
        config: {
          maxOutputTokens: 2048,
          temperature: 0.4,
        },
      });

      const text = response.text?.trim();

      if (!text) {
        throw new LlmProviderError("Gemini returned empty content", "empty_response", model);
      }

      return { text, model };
    } catch (error) {
      const mappedError = mapGeminiError(error, model);
      lastError = mappedError;

      if (!shouldRotateModel(mappedError.code)) {
        throw mappedError;
      }
    }
  }

  throw lastError ?? new LlmProviderError("Gemini rotation exhausted", "provider_error");
}
