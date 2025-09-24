import { ChatCompletionMessageParam, ResponseFormatJSONSchema } from "openai/resources";
export declare const openAIChatCompletion: (messages: ChatCompletionMessageParam[], response_format: ResponseFormatJSONSchema) => Promise<string>;
