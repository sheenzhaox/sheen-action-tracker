/// <reference lib="webworker" />
// Writes analysis files to the origin private file system from a worker (sync access handles
// are the most widely supported OPFS write path, incl. iOS Safari). Reads and deletes live in
// src/storage/analyses.ts, which also runs on the main thread.

export async function writeOpfsFile(analysisId: string, name: string, bytes: Uint8Array): Promise<string> {
  const root = await navigator.storage.getDirectory();
  const analyses = await root.getDirectoryHandle("analyses", { create: true });
  const dir = await analyses.getDirectoryHandle(analysisId, { create: true });
  const handle = await dir.getFileHandle(name, { create: true });
  const access = await handle.createSyncAccessHandle();
  try {
    access.truncate(0);
    let written = 0;
    while (written < bytes.length) written += access.write(bytes.subarray(written), { at: written });
    access.flush();
  } finally {
    access.close();
  }
  return `analyses/${analysisId}/${name}`;
}
