const store = require('../config/store');
const { sendLog } = require('../utils/logs');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    const config = store.getGuild(member.guild.id);
    const roleId = config.autoRole?.roleId;

    if (roleId) {
      const role = member.guild.roles.cache.get(roleId);
      if (role && !role.managed && role.editable) {
        await member.roles.add(role).catch((error) => console.error('Autorole failed:', error));
      }
    }

    await sendLog(member.guild, 'memberLogs', 'Member Joined', [
      `User: <@${member.id}>`,
      `Tag: **${member.user.tag}**`,
      `Account created: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
      roleId && member.guild.roles.cache.has(roleId) ? `Autorole: <@&${roleId}>` : null,
    ]);
  },
};
