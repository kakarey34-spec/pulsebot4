const { ActivityType } = require('discord.js');
const giveawayService = require('../services/giveawayService');
const backupService = require('../services/backupService');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setPresence({
      activities: [{ name: 'Pulse Studios Made By LyxosDime', type: ActivityType.Watching }],
      status: 'online',
    });
    await client.slashHandler.deployCommands();
    await backupService.restoreFromChannel(client);
    backupService.startScheduler(client);
    giveawayService.startScheduler(client);
  },
};
