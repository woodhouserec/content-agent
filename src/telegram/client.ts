import type { InlineKeyboardMarkup } from "./types";

interface SendMessageOptions {
  replyMarkup?: InlineKeyboardMarkup;
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

  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
    await this.call("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text
    });
  }

  private async call(method: string, body: Record<string, unknown>): Promise<void> {
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
  }
}
