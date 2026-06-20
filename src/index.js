require('dotenv').config();
const http = require('http');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { loadEvents } = require('./handlers/eventHandler');
const { createSlashCommandHandler } = require('./handlers/commandHandler');
const store = require('./config/store');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
});

client.slashHandler = createSlashCommandHandler(client);
loadEvents(client);

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('Missing DISCORD_TOKEN in environment.');
  process.exit(1);
}

const port = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    const body = JSON.stringify({
      status: client.isReady() ? 'ok' : 'starting',
      bot: 'pulsebot4',
      storage: 'json',
      components: 'v2',
      uptime: Math.round(process.uptime()),
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(body);
  })
  .listen(port, () => console.log(`Health server listening on ${port}`));

store
  .init()
  .then(() => client.login(token))
  .catch((error) => {
    console.error('Failed to start Pulsebot:', error);
    process.exit(1);
  });
