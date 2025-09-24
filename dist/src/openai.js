"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openAIChatCompletion = void 0;
const openai_1 = __importDefault(require("openai"));
const openAIChatCompletion = async (messages, response_format) => {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error("The OpenAI API key (OPENAI_API_KEY) is not defined. Please set it in your environment variables.");
    }
    const client = new openai_1.default({
        apiKey: process.env.OPENAI_API_KEY,
    });
    const chatCompletionResponse = await client.chat.completions.create({
        messages,
        model: "gpt-4o-mini",
        response_format,
    });
    return chatCompletionResponse.choices[0].message.content || "";
};
exports.openAIChatCompletion = openAIChatCompletion;
