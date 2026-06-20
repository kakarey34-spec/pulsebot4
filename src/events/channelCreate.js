const store = require('../config/store');
const { sendLog } = require('../utils/logs');

module.exports = {
  name: 'channelCreate',
  async execute(channel) {
    if (!channel.guild) return;
    await sendLog(channel.guild, 'channelLogs', 'Channel Created', [
      `Channel: <#${channel.id}>`,
      `Name: **${channel.name}**`,
    ]);
    const config = store.getGuild(channel.guild.id);
    if (!config.antiNuke.enabled) return;
  },
};
