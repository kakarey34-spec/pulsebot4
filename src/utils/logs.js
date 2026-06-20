const { message, container, text, separator } = require('./v2');
const store = require('../config/store');

async function sendLog(guild, channelKey, title, lines = []) {
  const config = store.getGuild(guild.id);
  const channelId = config.channels[channelKey];
  if (!channelId) return null;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return null;

  return channel
    .send(
      message(
        container([
          text(`### ${title}`),
          separator(),
          text(lines.filter(Boolean).join('\n') || '_No details_'),
          text(`-# <t:${Math.floor(Date.now() / 1000)}:F> | ${config.brand.footer}`),
        ], config.brand.color)
      )
    )
    .catch(() => null);
}

module.exports = { sendLog };
