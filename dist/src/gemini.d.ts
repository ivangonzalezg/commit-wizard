import { ChatCompletionMessageParam, ResponseFormatJSONSchema } from "openai/resources";
export declare const geminiChatCompletion: (messages: ChatCompletionMessageParam[], response_format: ResponseFormatJSONSchema) => Promise<string>;
