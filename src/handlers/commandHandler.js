const fs = require('fs');
const path = require('path');
const { Collection, REST, Routes } = require('discord.js');
const { canUse, deny } = require('../utils/permissions');
const { sendLog } = require('../utils/logs');

const ENABLED_COMMANDS = new Set([
  'admin',
  'giveaway',
  'payment',
  'product',
  'promo',
  'review',
  'suggestion',
  'ticket',
]);

function loadCommands(dir, collection) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      loadCommands(fullPath, collection);
    } else if (entry.name.endsWith('.js')) {
      delete require.cache[require.resolve(fullPath)];
      const command = require(fullPath);
      if (command.data?.name && ENABLED_COMMANDS.has(command.data.name)) {
        collection.set(command.data.name, command);
      }
    }
  }
}

function createSlashCommandHandler(client) {
  const commands = new Collection();
  loadCommands(path.join(__dirname, '../commands'), commands);
  client.commands = commands;

  async function deployCommands() {
    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.CLIENT_ID || client.user.id;
    const guildId = process.env.GUILD_ID;
    const rest = new REST({ version: '10' }).setToken(token);
    const body = [...commands.values()].map((command) => command.data.toJSON());
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
      console.log(`Registered ${body.length} guild slash commands.`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body });
      console.log(`Registered ${body.length} global slash commands.`);
    }
  }

  async function handleSlashCommand(interaction) {
    const command = commands.get(interaction.commandName);
    if (!command) return;

    if (command.permissionLevel != null && !canUse(interaction.member, command.permissionLevel)) {
      return deny(interaction, command.permissionLabel || 'staff');
    }

    await sendLog(interaction.guild, 'commandLogs', 'Bot Command Used', [
      `Command: **/${interaction.commandName}**`,
      `User: <@${interaction.user.id}>`,
      `Channel: <#${interaction.channelId}>`,
    ]);

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`/${interaction.commandName} failed:`, error);
      const payload = { content: 'Something went wrong while running that command.', ephemeral: true };
      if (interaction.deferred || interaction.replied) return interaction.editReply(payload).catch(() => null);
      return interaction.reply(payload).catch(() => null);
    }
  }

  return { deployCommands, handleSlashCommand };
}

module.exports = { createSlashCommandHandler };
