const store = require('../config/store');
const { sendLog } = require('../utils/logs');

module.exports = {
  name: 'channelDelete',
  async execute(channel) {
    if (!channel.guild) return;
    await sendLog(channel.guild, 'channelLogs', 'Channel Deleted', [
      `Name: **${channel.name}**`,
      `ID: \`${channel.id}\``,
    ]);
    const config = store.getGuild(channel.guild.id);
    if (config.antiNuke.enabled) {
      await sendLog(channel.guild, 'securityLogs', 'Anti Nuke Watch', [
        `Channel deletion detected: **${channel.name}**`,
      ]);
    }
  },
};
