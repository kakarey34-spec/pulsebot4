const { sendLog } = require('../utils/logs');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    if (oldState.channelId === newState.channelId) return;
    const action = newState.channelId ? 'Joined Voice' : 'Left Voice';
    await sendLog(newState.guild, 'voiceLogs', action, [
      `User: <@${newState.id}>`,
      newState.channelId ? `Channel: <#${newState.channelId}>` : `Channel: **${oldState.channel?.name || oldState.channelId}**`,
    ]);
  },
};
