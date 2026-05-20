export type LlmProviderCode =
  | "missing_key"
  | "quota"
  | "invalid_request"
  | "authentication"
  | "permission_denied"
  | "not_found"
  | "empty_response"
  | "internal"
  | "unavailable"
  | "timeout"
  | "provider_error";

export interface InlineFileInput {
  mimeType: string;
  data: string;
}

export interface GenerateTextResult {
  text: string;
  model: string;
}

export interface StructuredTrendSummary {
  overview: string;
  keyChanges: string[];
  actionPlan: string[];
  watchouts: string[];
}

export class LlmProviderError extends Error {
  constructor(
    message: string,
    readonly code: LlmProviderCode,
    readonly model?: string,
  ) {
    super(message);
    this.name = "LlmProviderError";
  }
}
