const { ActivityType } = require('discord.js');
const giveawayService = require('../services/giveawayService');

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
    giveawayService.startScheduler(client);
  },
};
