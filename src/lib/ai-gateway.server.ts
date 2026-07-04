import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "resumeiq-ai",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
  });
}
