const { AttachmentBuilder } = require('discord.js');
const store = require('../config/store');

const BACKUP_FILENAME = 'pulsebot-backup.txt';
const LEGACY_BACKUP_FILENAME = 'pulsebot-backup.json';
const INTERVAL_MS = 10 * 60 * 1000;
let timer = null;

function buildBackupBody(snapshot) {
  const exported = new Date(snapshot.exportedAt).toISOString();
  const json = JSON.stringify(snapshot, null, 2);
  return [
    '=== PULSE STUDIO BACKUP ===',
    `Exported: ${exported}`,
    '',
    'Copy everything below this line to restore data:',
    '--- BACKUP DATA START ---',
    json,
    '--- BACKUP DATA END ---',
  ].join('\n');
}

function buildBackupAttachment() {
  const snapshot = store.exportSnapshot();
  return {
    snapshot,
    attachment: new AttachmentBuilder(Buffer.from(buildBackupBody(snapshot), 'utf8'), {
      name: BACKUP_FILENAME,
      description: 'Pulsebot data backup',
    }),
  };
}

function isBackupAttachment(name) {
  return name === BACKUP_FILENAME || name === LEGACY_BACKUP_FILENAME;
}

function parseBackupText(text) {
  const start = text.indexOf('--- BACKUP DATA START ---');
  const end = text.indexOf('--- BACKUP DATA END ---');
  const jsonText = start !== -1 && end !== -1
    ? text.slice(start + '--- BACKUP DATA START ---'.length, end).trim()
    : text.trim();
  return JSON.parse(jsonText);
}

async function sendBackup(guild) {
  const config = store.getGuild(guild.id);
  const channelId = config.backup?.channelId || process.env.BACKUP_CHANNEL_ID;
  if (!channelId) return null;

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return null;

  const { snapshot, attachment } = buildBackupAttachment();
  return channel.send({
    content: `**Pulse Studio Backup** — <t:${Math.floor(snapshot.exportedAt / 1000)}:F>\nDownload \`${BACKUP_FILENAME}\` below and open it to copy the backup data.`,
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
    msg.attachments.some((a) => isBackupAttachment(a.name))
  );
  if (!backupMessage) return false;

  const attachment = backupMessage.attachments.find((a) => isBackupAttachment(a.name));
  if (!attachment?.url) return false;

  try {
    const response = await fetch(attachment.url);
    const text = await response.text();
    const snapshot = parseBackupText(text);
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
