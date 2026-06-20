const store = require('../config/store');
const { sendLog } = require('../utils/logs');

const LINK_RE = /(https?:\/\/|discord\.gg\/|www\.)/i;

function hasIgnoredRole(message, config) {
  return (config.antiLink.ignoredRoleIds || []).some((id) => message.member?.roles.cache.has(id));
}

function isAuthorizedUser(message, config) {
  return (config.antiLink.authorizedUserIds || []).includes(message.author.id);
}

function isAllowedDomain(content, config) {
  const allowed = config.antiLink.allowedDomains || [];
  if (!allowed.length) return false;
  return allowed.some((domain) => content.toLowerCase().includes(domain.toLowerCase()));
}

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (!message.guild || message.author.bot) return;
    const config = store.getGuild(message.guild.id);

    if (message.channelId === config.channels.suggestions) {
      await message.react('✅').catch(() => null);
      await message.react('❌').catch(() => null);
    }

    if (
      config.antiLink.enabled &&
      LINK_RE.test(message.content || '') &&
      !hasIgnoredRole(message, config) &&
      !isAuthorizedUser(message, config) &&
      !isAllowedDomain(message.content, config)
    ) {
      await message.delete().catch(() => null);
      await sendLog(message.guild, 'antiLinkLogs', 'Anti Link Blocked Message', [
        `User: <@${message.author.id}>`,
        `Channel: <#${message.channelId}>`,
        `Content: \`${String(message.content).slice(0, 500).replace(/`/g, "'")}\``,
      ]);
      await message.channel
        .send({ content: `<@${message.author.id}> links are not allowed here.`, allowedMentions: { users: [message.author.id] } })
        .then((sent) => setTimeout(() => sent.delete().catch(() => null), 5000))
        .catch(() => null);
    }
  },
};
