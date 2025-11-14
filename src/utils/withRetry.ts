type RetryOptions = {
  maxRetries?: number;
  retryDelayMs?: number;
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const withRetry = async <TResult>(
  fn: () => Promise<TResult>,
  options: RetryOptions = {}
): Promise<TResult> => {
  const { maxRetries = 3, retryDelayMs = 1000 } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
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
