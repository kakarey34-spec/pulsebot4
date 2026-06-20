const { sendLog } = require('../utils/logs');

module.exports = {
  name: 'roleCreate',
  async execute(role) {
    await sendLog(role.guild, 'roleLogs', 'Role Created', [`Role: <@&${role.id}>`, `Name: **${role.name}**`]);
  },
};
