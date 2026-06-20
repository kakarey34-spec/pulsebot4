const { AuditLogEvent } = require('discord.js');
const store = require('../config/store');
const { sendLog } = require('../utils/logs');

async function channelDeleteActor(guild, channelId) {
  try {
    const audit = await guild.fetchAuditLogs({ limit: 5, type: AuditLogEvent.ChannelDelete });
    const entry = audit.entries.find((item) => item.target?.id === channelId);
    return entry?.executor?.id || null;
  } catch {
    return null;
  }
}

function isIgnoredAntiNukeActor(guild, config, actorId) {
  if (!actorId) return false;
  if (actorId === guild.client.user.id) return true;
  const ignored = config.antiNuke.ignoredUserIds || [];
  return ignored.includes(actorId);
}

module.exports = {
  name: 'channelDelete',
  async execute(channel) {
    if (!channel.guild) return;
    await sendLog(channel.guild, 'channelLogs', 'Channel Deleted', [
      `Name: **${channel.name}**`,
      `ID: \`${channel.id}\``,
    ]);

    const config = store.getGuild(channel.guild.id);
    if (!config.antiNuke.enabled) return;

    if (store.getTicket(channel.id)) return;

    const actorId = await channelDeleteActor(channel.guild, channel.id);
    if (isIgnoredAntiNukeActor(channel.guild, config, actorId)) return;

    await sendLog(channel.guild, 'securityLogs', 'Anti Nuke Watch', [
      `Channel deletion detected: **${channel.name}**`,
      actorId ? `Actor: <@${actorId}>` : null,
    ]);
  },
};
