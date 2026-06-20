# Pulsebot4

Pulsebot4 is a Pulse Studio Discord bot using Components v2 messages, JSON file storage, tickets, products, discount promocodes, PayPal/PaySafe payment instructions, reviews, giveaways, suggestions, anti-link, anti-nuke style logging, and basic admin commands.

## Features

- Components v2 ticket panel with live active counters for purchase, support, and partner tickets.
- Purchase tickets require a product ID before the private channel opens.
- Product listings with product ID, image URL, detailed description, and EUR price.
- Discount-only promocodes.
- PayPal instructions with configurable email.
- PaySafe instructions with automatic round-up to the nearest card tier: EUR 5, 10, 25, 50, or 100.
- Ticket transcripts posted to `1517513514397204520`.
- Review channel: `1517500145149935636`.
- Suggestion channel auto-reacts with check and X: `1517695780490707014`.
- Anti-link logs: `1517513591006167242`.
- Security/nuke logs: `1517513767129190523`.
- Watching status: `Pulse Studio Made By LyxosDime`.
- JSON storage under `data/`.

## Discord Developer Portal Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications).
2. Create an application named `Pulsebot4`.
3. Open **Bot** and create/reset the token.
4. Enable these privileged gateway intents:
   - Server Members Intent
   - Message Content Intent
5. Open **OAuth2 -> URL Generator**.
6. Select scopes:
   - `bot`
   - `applications.commands`
7. Select bot permissions:
   - Manage Channels
   - Manage Roles
   - Manage Messages
   - Read Message History
   - Send Messages
   - Attach Files
   - Use Slash Commands
   - Moderate Members
   - Ban Members
   - Kick Members
8. Invite the bot with the generated URL.
9. Put the bot role above the roles/channels it needs to manage.

## Local Setup

```bash
npm install
copy .env.example .env
npm start
```

Fill `.env` with:

```env
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_application_id
GUILD_ID=your_server_id
PORT=3000
```

## Render Deployment Tutorial

1. Push this project to GitHub as `pulsebot4`.
2. Open [Render](https://render.com/).
3. Click **New +** -> **Web Service**.
4. Connect the `pulsebot4` GitHub repo.
5. Use these settings:
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: any always-on paid instance is best for Discord bots. Free instances may sleep.
6. Add environment variables:
   - `DISCORD_TOKEN`: your bot token
   - `CLIENT_ID`: your Discord application ID
   - `GUILD_ID`: your Discord server ID
7. Add a persistent disk so JSON files survive redeploys:
   - In the Render service, open **Disks**.
   - Add a disk mounted at `/opt/render/project/src/data`.
   - Size can be small, for example 1 GB.
8. Deploy.
9. Open the Render service URL. It should return JSON with `"status":"ok"` once the bot is online.

## First Server Commands

Run these in Discord:

```text
/ticket category category:#your-ticket-category
/ticket panel channel:#your-ticket-panel-channel
/payment paypal email:your-paypal@email.com
/payment paysafe instructions:Buy the shown PaySafe tier and send the code/proof here.
/product add name:Example Product price:10 description:Detailed product info id:PULSE-001 image_url:https://example.com/image.png channel:#shop
/promo create code:PULSE20 discount:20 channel:#promocodes
```

Customers open **Purchase Tickets**, enter the product ID such as `PULSE-001`, apply a promo if they have one, choose PayPal or PaySafe, then upload proof.

## Important Role IDs

- Owner: `1517510292526075925`
- Mod: `1517887427300036628`
- Seller: `1517887595638558830`

## Data Storage

The bot writes JSON files to `data/`:

- `guild-config.json`
- `active-tickets.json`
- `products.json`
- `promocodes.json`
- `giveaways.json`
- `ticket-counters.json`
- `security-actions.json`

On Render, the persistent disk must be mounted at the project `data` folder or the JSON files will reset on redeploy.
