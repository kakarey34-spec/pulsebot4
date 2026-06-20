const { sendLog } = require('../utils/logs');

module.exports = {
  name: 'roleDelete',
  async execute(role) {
    await sendLog(role.guild, 'roleLogs', 'Role Deleted', [`Name: **${role.name}**`, `ID: \`${role.id}\``]);
  },
};
