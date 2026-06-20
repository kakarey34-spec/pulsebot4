const { AttachmentBuilder } = require('discord.js');
const store = require('../config/store');
const v2 = require('../utils/v2');

const BACKUP_FILENAME = 'pulsebot-backup.json';
const INTERVAL_MS = 10 * 60 * 1000;
let timer = null;

function buildBackupAttachment() {
  const snapshot = store.exportSnapshot();
  return new AttachmentBuilder(Buffer.from(JSON.stringify(snapshot, null, 2), 'utf8'), {
    name: BACKUP_FILENAME,
    description: 'Pulsebot data backup',
  });
}

async function sendBackup(guild) {
  const config = store.getGuild(guild.id);
  const channelId = config.backup?.channelId || process.env.BACKUP_CHANNEL_ID;
  if (!channelId) return null;

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return null;

  const attachment = buildBackupAttachment();
  const snapshot = store.exportSnapshot();
  return channel.send({
    ...v2.message(
      v2.container(
        [
          v2.text('## Data Backup'),
          v2.text(
            [
              `**Pulse Studios** automatic backup`,
              `Exported: <t:${Math.floor(snapshot.exportedAt / 1000)}:F>`,
              `File: \`${BACKUP_FILENAME}\``,
            ].join('\n')
          ),
          v2.text(`-# ${config.brand.footer}`),
        ],
        config.brand.color
      )
    ),
    files: [attachment],
  });
}

async function restoreFromChannel(client) {
  const guildId = process.env.GUILD_ID;
  const guild = guildId
    ? await client.guilds.fetch(guildId).catch(() => null)
    : client.guilds.cache.first();
  if (!guild) return false;

  const config = store.getGuild(guild.id);
  const channelId = config.backup?.channelId || process.env.BACKUP_CHANNEL_ID;
  if (!channelId) return false;

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return false;

  const messages = await channel.messages.fetch({ limit: 25 }).catch(() => null);
  if (!messages?.size) return false;

  const backupMessage = [...messages.values()].find((msg) =>
    msg.attachments.some((a) => a.name === BACKUP_FILENAME)
  );
  if (!backupMessage) return false;

  const attachment = backupMessage.attachments.find((a) => a.name === BACKUP_FILENAME);
  if (!attachment?.url) return false;

  try {
    const response = await fetch(attachment.url);
    const snapshot = await response.json();
    const restored = store.importSnapshot(snapshot);
    if (restored) console.log(`Restored data from backup in #${channel.name} (${backupMessage.id})`);
    return restored;
  } catch (error) {
    console.error('Backup restore failed:', error);
    return false;
  }
}

function startScheduler(client) {
  if (timer) clearInterval(timer);
  timer = setInterval(async () => {
    const guildId = process.env.GUILD_ID;
    const guild = guildId
      ? await client.guilds.fetch(guildId).catch(() => null)
      : client.guilds.cache.first();
    if (!guild) return;
    await sendBackup(guild).catch((error) => console.error('Scheduled backup failed:', error));
  }, INTERVAL_MS);
}

module.exports = {
  BACKUP_FILENAME,
  sendBackup,
  restoreFromChannel,
  startScheduler,
};
