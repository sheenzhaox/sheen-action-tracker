// I/O helpers that need Web platform APIs (TextEncoder, CompressionStream, crypto.subtle).
// Kept out of the main entry so analysis packs stay free of platform APIs.
export * from "./ptrk.ts";
export * from "./recipe.ts";
