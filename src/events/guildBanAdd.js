const { sendLog } = require('../utils/logs');

module.exports = {
  name: 'guildBanAdd',
  async execute(ban) {
    await sendLog(ban.guild, 'moderationLogs', 'Member Banned', [
      `User: **${ban.user.tag}**`,
      `ID: \`${ban.user.id}\``,
    ]);
  },
};
