const { sendLog } = require('../utils/logs');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member) {
    await sendLog(member.guild, 'memberLogs', 'Member Left', [
      `User: **${member.user?.tag || member.id}**`,
      `ID: \`${member.id}\``,
    ]);
  },
};
