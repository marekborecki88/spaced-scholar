/**
 * Audio API client.
 *
 * Currently MOCKED — files are kept in memory and exposed via `blob:` URLs
 * created with `URL.createObjectURL`. Each upload is also indexed by a stable
 * id so callers can persist a reference and re-resolve it later in the session.
 *
 * Replace with real backend later:
 *   POST   /api/audio                multipart/form-data file -> { id, url }
 *   DELETE /api/audio/:id            -> 204
 *
 * NOTE: blob: URLs do not survive a full page reload. That is acceptable in
 * this mock layer — the real backend will return durable https:// URLs.
 */

const wait = (ms = 220) => new Promise((r) => setTimeout(r, ms));

export interface AudioAsset {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED = /^audio\//;

const cache = new Map<string, AudioAsset>();

export class AudioApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "AudioApiError";
  }
}

export const audioApi = {
  /** POST /api/audio — uploads a single audio file. */
  async upload(file: File): Promise<AudioAsset> {
    await wait();
    if (!ALLOWED.test(file.type)) {
      throw new AudioApiError(415, "Unsupported file type — audio only");
    }
    if (file.size > MAX_BYTES) {
      throw new AudioApiError(413, "File too large (max 10MB)");
    }
    const id = `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const url = URL.createObjectURL(file);
    const asset: AudioAsset = {
      id,
      url,
      name: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    };
    cache.set(id, asset);
    return asset;
  },

  /** DELETE /api/audio/:id */
  async remove(id: string): Promise<void> {
    await wait(120);
    const asset = cache.get(id);
    if (asset) {
      try { URL.revokeObjectURL(asset.url); } catch { /* ignore */ }
      cache.delete(id);
    }
  },
};
