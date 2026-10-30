/// <reference lib="webworker" />
// Writes analysis files to the origin private file system from a worker (sync access handles
// are the most widely supported OPFS write path, incl. iOS Safari).

async function analysisDir(id: string, create: boolean) {
  const root = await navigator.storage.getDirectory();
  const analyses = await root.getDirectoryHandle("analyses", { create });
  return analyses.getDirectoryHandle(id, { create });
}

export async function writeOpfsFile(analysisId: string, name: string, bytes: Uint8Array): Promise<string> {
  const dir = await analysisDir(analysisId, true);
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

/** Removes an analysis directory that never got its manifest (commit marker). */
export async function removeAnalysis(analysisId: string): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory();
    const analyses = await root.getDirectoryHandle("analyses");
    await analyses.removeEntry(analysisId, { recursive: true });
  } catch {
    // Nothing to clean up.
  }
}
