import { GoogleGenAI } from "@google/genai";
import {
  ChatCompletionMessageParam,
  ResponseFormatJSONSchema,
} from "openai/resources";
import { withRetry } from "./utils/withRetry";

export const geminiChatCompletion = async (
  messages: ChatCompletionMessageParam[],
  response_format: ResponseFormatJSONSchema
) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "The Gemini API key (GEMINI_API_KEY) is not defined. Please set it in your environment variables."
    );
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: messages.map((message) => message.content).join("\n\n"),
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: response_format.json_schema.schema,
      },
    })
  );

  return response?.text || "";
};
