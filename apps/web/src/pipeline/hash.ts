/** Streaming SHA-256 of a file in a worker (02 §1). Rejects if hashing fails. */
export function hashFile(file: File): { promise: Promise<string>; cancel: () => void } {
  const worker = new Worker(new URL("./hash.worker.ts", import.meta.url), { type: "module" });
  const promise = new Promise<string>((resolve, reject) => {
    worker.onmessage = (e: MessageEvent<{ sha256?: string; error?: string }>) => {
      worker.terminate();
      if (e.data.sha256) resolve(e.data.sha256);
      else reject(new Error(e.data.error ?? "hash failed"));
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message || "hash worker failed"));
    };
  });
  worker.postMessage({ file });
  return { promise, cancel: () => worker.terminate() };
}
