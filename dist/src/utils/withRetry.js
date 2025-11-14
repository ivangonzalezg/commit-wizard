"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRetry = void 0;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const withRetry = async (fn, options = {}) => {
    const { maxRetries = 3, retryDelayMs = 1000 } = options;
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt === maxRetries) {
                break;
            }
            if (retryDelayMs > 0) {
                await wait(retryDelayMs);
            }
        }
    }
    if (lastError instanceof Error) {
        throw lastError;
    }
    throw new Error("Operation failed after retries.");
};
exports.withRetry = withRetry;
