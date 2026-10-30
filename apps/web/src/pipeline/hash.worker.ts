/// <reference lib="webworker" />
import { createSHA256 } from "hash-wasm";

// Streaming SHA-256 of the video (02 §1): crypto.subtle cannot hash incrementally.
self.onmessage = async (e: MessageEvent<{ file: File }>) => {
  try {
    const hasher = await createSHA256();
    hasher.init();
    const reader = e.data.file.stream().getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      hasher.update(value);
    }
    self.postMessage({ sha256: hasher.digest("hex") });
  } catch (err) {
    self.postMessage({ error: String(err) });
  }
};
