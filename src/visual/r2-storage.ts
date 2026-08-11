import type { Env } from "../domain/runtime";

export class R2AssetStorage {
  constructor(private readonly env: Env) {}

  async put(input: { bytes: ArrayBuffer; mimeType: string; keyHint: string }): Promise<{ storageKey: string }> {
    if (!this.env.VISUAL_ASSETS) {
      throw new Error("R2 binding VISUAL_ASSETS is not configured");
    }

    const storageKey = `visual-assets/${input.keyHint}-${crypto.randomUUID()}.${extensionForMime(input.mimeType)}`;
    await this.env.VISUAL_ASSETS.put(storageKey, input.bytes, {
      httpMetadata: {
        contentType: input.mimeType
      }
    });

    return { storageKey };
  }

  async get(storageKey: string): Promise<{ bytes: ArrayBuffer; mimeType: string }> {
    if (!this.env.VISUAL_ASSETS) {
      throw new Error("R2 binding VISUAL_ASSETS is not configured");
    }

    const object = await this.env.VISUAL_ASSETS.get(storageKey);
    if (!object) {
      throw new Error("Visual asset was not found in R2");
    }

    return {
      bytes: await object.arrayBuffer(),
      mimeType: object.httpMetadata?.contentType ?? "image/png"
    };
  }
}

function extensionForMime(mimeType: string): string {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}
