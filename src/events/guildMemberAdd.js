const { sendLog } = require('../utils/logs');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    await sendLog(member.guild, 'memberLogs', 'Member Joined', [
      `User: <@${member.id}>`,
      `Tag: **${member.user.tag}**`,
      `Account created: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
    ]);
  },
};
