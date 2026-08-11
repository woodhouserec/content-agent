import type { TelegramReplyMarkup } from "./types";

interface SendMessageOptions {
  replyMarkup?: TelegramReplyMarkup;
}

export class TelegramClient {
  constructor(private readonly botToken: string) {}

  async setWebhook(url: string, secretToken: string): Promise<void> {
    await this.call("setWebhook", {
      url,
      secret_token: secretToken,
      allowed_updates: ["message", "callback_query"]
    });
  }

  async sendMessage(chatId: string, text: string, options: SendMessageOptions = {}): Promise<void> {
    await this.call("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: options.replyMarkup
    });
  }

  async sendPhoto(chatId: string, input: { bytes: ArrayBuffer; mimeType: string; filename: string; caption?: string; replyMarkup?: TelegramReplyMarkup }): Promise<void> {
    const form = new FormData();
    form.set("chat_id", chatId);
    form.set("photo", new Blob([input.bytes], { type: input.mimeType }), input.filename);
    if (input.caption) {
      form.set("caption", input.caption);
      form.set("parse_mode", "HTML");
    }
    if (input.replyMarkup) {
      form.set("reply_markup", JSON.stringify(input.replyMarkup));
    }

    await this.callForm("sendPhoto", form);
  }

  async downloadFile(fileId: string): Promise<{ bytes: ArrayBuffer; mimeType: string | null; filePath: string }> {
    const file = await this.callWithResult<{ file_path?: string }>("getFile", { file_id: fileId });
    if (!file.file_path) {
      throw new Error("Telegram file path was not returned");
    }

    const response = await fetch(`https://api.telegram.org/file/bot${this.botToken}/${file.file_path}`);
    if (!response.ok) {
      throw new Error(`Telegram file download failed: ${response.status}`);
    }

    return {
      bytes: await response.arrayBuffer(),
      mimeType: response.headers.get("content-type"),
      filePath: file.file_path
    };
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
    await this.call("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text
    });
  }

  async setMyCommands(commands: Array<{ command: string; description: string }>): Promise<void> {
    await this.call("setMyCommands", { commands });
  }

  private async call(method: string, body: Record<string, unknown>): Promise<void> {
    await this.callWithResult(method, body);
  }

  private async callWithResult<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`https://api.telegram.org/bot${this.botToken}/${method}`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Telegram API ${method} failed: ${response.status} ${errorText}`);
    }

    const payload = await response.json() as { ok?: boolean; result?: T; description?: string };
    if (!payload.ok || payload.result === undefined) {
      throw new Error(`Telegram API ${method} failed: ${payload.description ?? "missing result"}`);
    }

    return payload.result;
  }

  private async callForm(method: string, body: FormData): Promise<void> {
    const response = await fetch(`https://api.telegram.org/bot${this.botToken}/${method}`, {
      method: "POST",
      body
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Telegram API ${method} failed: ${response.status} ${errorText}`);
    }
  }
}
