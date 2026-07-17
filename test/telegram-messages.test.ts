import assert from "node:assert/strict";
import test from "node:test";
import { buildHelpMessage, buildStartMessage } from "../src/telegram/commands";

test("start and help messages do not contain unsupported Telegram HTML tags", async () => {
  const messages = [await buildStartMessage(), await buildHelpMessage()];

  for (const message of messages) {
    assert.equal(/<(?!\/?(b|i|u|s|code|pre|a)(\s|>|$))[^>]+>/.test(message), false, message);
  }
});

