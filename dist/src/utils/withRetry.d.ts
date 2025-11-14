type RetryOptions = {
    maxRetries?: number;
    retryDelayMs?: number;
};
export declare const withRetry: <TResult>(fn: () => Promise<TResult>, options?: RetryOptions) => Promise<TResult>;
export {};
