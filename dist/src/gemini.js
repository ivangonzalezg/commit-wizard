"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiChatCompletion = void 0;
const genai_1 = require("@google/genai");
const geminiChatCompletion = async (messages, response_format) => {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("The Gemini API key (GEMINI_API_KEY) is not defined. Please set it in your environment variables.");
    }
    const ai = new genai_1.GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
    });
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: messages.map((message) => message.content).join("\n\n"),
        config: {
            responseMimeType: "application/json",
            responseJsonSchema: response_format.json_schema.schema,
        },
    });
    return response?.text || "";
};
exports.geminiChatCompletion = geminiChatCompletion;
