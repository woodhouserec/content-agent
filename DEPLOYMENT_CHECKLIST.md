# Deployment Checklist

Follow this checklist one line at a time.

Do not skip steps.

Do not put real tokens into GitHub.

## Part 1. Create A Telegram Bot

1. Open Telegram.
2. Search for `@BotFather`.
3. Open the chat with `BotFather`.
4. Send this message:

   ```text
   /newbot
   ```

5. Type a display name for the bot.
6. Type a username for the bot.
7. Wait for BotFather to show a token.
8. Copy the token.
9. Save it somewhere private.
10. Name this saved value:

    ```text
    TELEGRAM_BOT_TOKEN
    ```

Expected result: you have one private Telegram bot token.

## Part 2. Find Your Telegram User ID

1. Open Telegram.
2. Search for `@userinfobot`.
3. Open the chat.
4. Press `Start`.
5. Find the number called `Id`.
6. Copy this number.
7. Save it somewhere private.
8. Name this saved value:

   ```text
   ALLOWED_TELEGRAM_USER_ID
   ```

Expected result: you have your numeric Telegram user ID.

## Part 3. Create Two Private Secrets

1. Open any password manager or notes app.
2. Create a long random text value.
3. Save it as:

   ```text
   TELEGRAM_WEBHOOK_SECRET
   ```

4. Create another long random text value.
5. Save it as:

   ```text
   SETUP_SECRET
   ```

Expected result: you have two private random strings.

## Part 4. Create A GitHub Repository

1. Open GitHub in your browser.
2. Click the `+` button in the top right corner.
3. Click `New repository`.
4. In `Repository name`, type:

   ```text
   content-agent
   ```

5. Select `Private`.
6. Do not add a README.
7. Do not add `.gitignore`.
8. Do not add a license.
9. Click `Create repository`.
10. Copy the repository URL.

Expected result: you have an empty GitHub repository.

## Part 5. Upload This Project To GitHub

If Codex has GitHub access, ask Codex to push the project.

If Codex does not have GitHub access, do this:

1. Open the GitHub repository page.
2. Click `uploading an existing file`.
3. Upload all project files and folders.
4. Do not upload `.env`, `.dev.vars`, `node_modules`, `.wrangler`, or `.pnpm-store`.
5. Click `Commit changes`.

Expected result: GitHub shows the project files.

## Part 6. Create A D1 Database In Cloudflare

1. Open Cloudflare Dashboard.
2. Select your Cloudflare account.
3. Click `Workers & Pages`.
4. Click `D1 SQL Database`.
5. Click `Create database`.
6. In `Database name`, type:

   ```text
   content-agent
   ```

7. Click `Create`.
8. Copy the database ID.
9. Save the database ID somewhere private.

Expected result: Cloudflare shows a D1 database named `content-agent`.

## Part 7. Apply The D1 Migration In Cloudflare Dashboard

1. Open Cloudflare Dashboard.
2. Click `Workers & Pages`.
3. Click `D1 SQL Database`.
4. Click the `content-agent` database.
5. Click `Console`.
6. Open the project file:

   ```text
   migrations/0001_initial.sql
   ```

7. Copy the whole file content.
8. Paste it into the D1 Console.
9. Click `Execute`.

Expected result: Cloudflare shows that the SQL executed successfully.

## Part 8. Connect GitHub Repository To Cloudflare Worker

1. Open Cloudflare Dashboard.
2. Click `Workers & Pages`.
3. Click `Create application`.
4. Choose the GitHub connection option.
5. Select your GitHub account.
6. Select the repository:

   ```text
   content-agent
   ```

7. Choose Workers deployment if Cloudflare asks for project type.
8. Set the Worker name:

   ```text
   content-agent
   ```

9. Confirm that the entrypoint is:

   ```text
   src/index.ts
   ```

Expected result: Cloudflare has a Worker connected to GitHub.

## Part 9. Add The D1 Binding

1. Open the `content-agent` Worker in Cloudflare.
2. Click `Settings`.
3. Click `Bindings`.
4. Click `Add binding`.
5. Choose `D1 database`.
6. In `Variable name`, type:

   ```text
   DB
   ```

7. Select the D1 database:

   ```text
   content-agent
   ```

8. Click `Save`.

Expected result: the Worker has a D1 binding named `DB`.

## Part 10. Add Worker Secrets

1. Open the `content-agent` Worker in Cloudflare.
2. Click `Settings`.
3. Click `Variables and Secrets`.
4. Click `Add`.
5. Add a secret named:

   ```text
   TELEGRAM_BOT_TOKEN
   ```

6. Paste your Telegram bot token.
7. Click `Save`.
8. Add a secret named:

   ```text
   TELEGRAM_WEBHOOK_SECRET
   ```

9. Paste your webhook secret.
10. Click `Save`.
11. Add a secret or variable named:

    ```text
    ALLOWED_TELEGRAM_USER_ID
    ```

12. Paste your Telegram user ID.
13. Click `Save`.
14. Add a secret named:

    ```text
    SETUP_SECRET
    ```

15. Paste your setup secret.
16. Click `Save`.

Expected result: the Worker has all four private values.

## Part 11. Deploy The Worker

1. Open the `content-agent` Worker in Cloudflare.
2. Open the deployment section.
3. Click `Deploy`.
4. Wait until Cloudflare shows a successful deployment.
5. Copy the public Worker URL.
6. Save it as:

   ```text
   WORKER_URL
   ```

Expected result: you have a public URL like `https://content-agent.example.workers.dev`.

## Part 12. Check `/health`

1. Open a new browser tab.
2. Paste your `WORKER_URL`.
3. Add this to the end:

   ```text
   /health
   ```

4. Press Enter.

Expected result:

```json
{
  "ok": true,
  "service": "content-agent",
  "worker": "available",
  "d1": "available"
}
```

## Part 13. Install The Telegram Webhook Safely

1. Open a new browser tab.
2. Paste your `WORKER_URL`.
3. Add this to the end:

   ```text
   /setup
   ```

4. Press Enter.
5. Find the section `1. Установить Telegram webhook`.
6. Paste your `SETUP_SECRET` into the password field.
7. Click `Установить webhook`.

Expected result:

```json
{
  "ok": true,
  "webhook": "https://your-worker-url/telegram/webhook"
}
```

## Part 14. Check Telegram Commands

1. Open Telegram.
2. Open your bot.
3. Send:

   ```text
   /start
   ```

4. Confirm that the bot replies.
5. Send:

   ```text
   /help
   ```

6. Confirm that the bot replies.
7. Send:

   ```text
   /status
   ```

8. Confirm that the bot says Worker and D1 are available.

Expected result: only your Telegram account can use the bot.

## Part 15. Test The Scheduled Handler Manually

1. Open a browser tab.
2. Open:

   ```text
   WORKER_URL/setup
   ```

3. Find the section `2. Проверить scheduled handler`.
4. Paste your `SETUP_SECRET` into the password field.
5. Click `Запустить проверку Cron`.

Expected result:

```json
{
  "ok": true,
  "message": "Scheduled handler completed."
}
```

## Part 16. Check That `processing_runs` Has A Row

1. Open Cloudflare Dashboard.
2. Click `Workers & Pages`.
3. Click `D1 SQL Database`.
4. Click the `content-agent` database.
5. Click `Console`.
6. Paste this SQL:

   ```sql
   SELECT * FROM processing_runs ORDER BY started_at DESC LIMIT 5;
   ```

7. Click `Execute`.

Expected result: you see at least one row with status `completed`.

## Part 17. Apply Stage 2 Migrations

1. Open Cloudflare Dashboard.
2. Click `Workers & Pages`.
3. Click `D1 SQL Database`.
4. Click the `content-agent` database.
5. Click `Console`.
6. Open this GitHub file:

   ```text
   migrations/0002_collection_pipeline.sql
   ```

7. Copy the whole file content.
8. Paste it into the D1 Console.
9. Click `Execute`.
10. Open this GitHub file:

    ```text
    migrations/0003_seed_sources.sql
    ```

11. Copy the whole file content.
12. Paste it into the D1 Console.
13. Click `Execute`.

Expected result: Cloudflare shows successful SQL execution for both files.

## Part 18. Run Collection From Telegram

1. Open Telegram.
2. Open your bot.
3. Send:

   ```text
   /collect
   ```

4. Wait for the bot to confirm that collection finished.
5. Send:

   ```text
   /status
   ```

Expected result: `/status` shows real counters for new materials, duplicates, source errors, and total collected items.

## Part 19. Check Collected Items In D1

1. Open Cloudflare Dashboard.
2. Click `Workers & Pages`.
3. Click `D1 SQL Database`.
4. Click the `content-agent` database.
5. Click `Console`.
6. Paste this SQL:

   ```sql
   SELECT source_id, title, canonical_url, published_at, collected_at
   FROM collected_items
   ORDER BY collected_at DESC
   LIMIT 10;
   ```

7. Click `Execute`.

Expected result: you see collected RSS/Atom materials.

## Part 20. Check Deduplication

1. Open Telegram.
2. Send:

   ```text
   /collect
   ```

3. Wait for completion.
4. Send:

   ```text
   /status
   ```

Expected result: the second run should show duplicates instead of adding the same items again.

## Done

The first vertical slice is deployed when all checks pass:

- `/health` works;
- Telegram bot answers `/start`;
- Telegram bot answers `/help`;
- Telegram bot answers `/status`;
- manual scheduled test creates a `processing_run`;
- `/collect` creates `collected_items`;
- no token was pasted into GitHub or browser URL.
