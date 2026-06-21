const { ActivityType } = require('discord.js');
const giveawayService = require('../services/giveawayService');
const backupService = require('../services/backupService');
const { ensureGuildEmojis } = require('../constants/emojis');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setPresence({
      activities: [{ name: 'Pulse Studio Made By LyxosDime', type: ActivityType.Watching }],
      status: 'online',
    });
    await client.slashHandler.deployCommands();
    const guildId = process.env.GUILD_ID;
    if (guildId) {
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (guild) await ensureGuildEmojis(guild);
    }
    await backupService.restoreFromChannel(client);
    backupService.startScheduler(client);
    giveawayService.startScheduler(client);
  },
};
