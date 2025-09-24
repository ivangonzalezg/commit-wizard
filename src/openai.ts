import OpenAI from "openai";
import {
  ChatCompletionMessageParam,
  ResponseFormatJSONSchema,
} from "openai/resources";

export const openAIChatCompletion = async (
  messages: ChatCompletionMessageParam[],
  response_format: ResponseFormatJSONSchema
) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "The OpenAI API key (OPENAI_API_KEY) is not defined. Please set it in your environment variables."
    );
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const chatCompletionResponse = await client.chat.completions.create({
    messages,
    model: "gpt-4o-mini",
    response_format,
  });

  return chatCompletionResponse.choices[0].message.content || "";
};
