const EMOJIS = {
  star: { id: '1460288819973722142', animated: false },
  greenDot: { id: '1403448015573880852', animated: true },
  redDot: { id: '1406078104836771881', animated: true },
  paypal: { id: '1453762809207717941', animated: false },
  paysafe: { id: '1453763515671253054', animated: false },
  confetti: { id: '1480600503543926965', animated: true },
};

async function ensureGuildEmojis(guild) {
  if (!guild?.emojis) return;
  const needed = Object.values(EMOJIS).map((e) => e.id);
  const missing = needed.some((id) => !guild.emojis.cache.has(id));
  if (missing || guild.emojis.cache.size === 0) {
    await guild.emojis.fetch().catch(() => null);
  }
}

function emojiPayload(key) {
  const def = EMOJIS[key];
  if (!def) return null;
  return { id: def.id, animated: Boolean(def.animated) };
}

function emojiString(guild, key, fallback = '') {
  const def = EMOJIS[key];
  if (!def) return fallback;
  const cached = guild?.emojis?.cache?.get(def.id);
  if (cached) return cached.toString();
  return fallback;
}

async function resolveEmojiString(guild, key, fallback = '') {
  await ensureGuildEmojis(guild);
  return emojiString(guild, key, fallback);
}

async function starsLine(guild, count) {
  const star = await resolveEmojiString(guild, 'star', '⭐');
  return `${star.repeat(count)} (${count}/5)`;
}

module.exports = {
  EMOJIS,
  emojiPayload,
  emojiString,
  resolveEmojiString,
  ensureGuildEmojis,
  starsLine,
};
