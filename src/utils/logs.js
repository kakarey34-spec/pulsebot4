const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const store = require('../config/store');
const v2 = require('./v2');

async function sendLog(guild, channelKey, title, lines = []) {
  const config = store.getGuild(guild.id);
  const channelId = config.channels[channelKey];
  if (!channelId) return null;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return null;

  return channel
    .send(
      v2.message(
        v2.container([
          v2.text(`### ${title}`),
          v2.separator(),
          v2.text(lines.filter(Boolean).join('\n') || '_No details_'),
          v2.text(`-# <t:${Math.floor(Date.now() / 1000)}:F>`),
        ], config.brand.color)
      )
    )
    .catch(() => null);
}

async function sendTicketTranscript(guild, lines = [], txtContent, txtFilename) {
  const config = store.getGuild(guild.id);
  const channelId = config.tickets.transcriptChannelId || config.channels.ticketLogs;
  if (!channelId) return null;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return null;

  const embed = new EmbedBuilder()
    .setColor(config.brand.color)
    .setTitle('Ticket Transcript')
    .setDescription(
      [
        lines.filter(Boolean).join('\n'),
        '',
        `📎 Full conversation attached: \`${txtFilename}\``,
      ].join('\n')
    )
    .setTimestamp();

  return channel
    .send({
      embeds: [embed],
      files: [new AttachmentBuilder(Buffer.from(txtContent, 'utf8'), { name: txtFilename })],
    })
    .catch(() => null);
}

module.exports = { sendLog, sendTicketTranscript };
