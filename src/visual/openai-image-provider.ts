import type { Env } from "../domain/runtime";
import { visualConfig } from "./config";

export interface GeneratedVisualImage {
  bytes: ArrayBuffer;
  mimeType: string;
  width: number;
  height: number;
  generationProvider: string;
  generationModel: string;
  generationPrompt: string;
}

export class OpenAiImageProvider {
  constructor(private readonly env: Env) {}

  async generate(prompt: string): Promise<GeneratedVisualImage> {
    const apiKey = this.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const model = this.env.OPENAI_IMAGE_MODEL ?? visualConfig.defaultImageModel;
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        prompt: prompt.slice(0, visualConfig.maxPromptLength),
        size: visualConfig.defaultSize,
        quality: visualConfig.defaultQuality,
        n: 1
      })
    });

    const body = await response.json() as { data?: Array<{ b64_json?: string }>; error?: { message?: string } };
    if (!response.ok) {
      throw new Error(`OpenAI image generation failed: HTTP ${response.status} ${body.error?.message ?? "unknown error"}`);
    }

    const base64 = body.data?.[0]?.b64_json;
    if (!base64) {
      throw new Error("OpenAI image generation response did not include image data");
    }

    return {
      bytes: base64ToArrayBuffer(base64),
      mimeType: "image/png",
      width: 1024,
      height: 1024,
      generationProvider: "openai",
      generationModel: model,
      generationPrompt: prompt
    };
  }
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}
