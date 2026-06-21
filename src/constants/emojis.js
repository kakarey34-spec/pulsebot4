const EMOJIS = {
  star: { id: '1460288819973722142', animated: false },
  greenDot: { id: '1403448015573880852', animated: true },
  redDot: { id: '1406078104836771881', animated: true },
  paypal: { id: '1453762809207717941', animated: false },
  paysafe: { id: '1453763515671253054', animated: false },
  confetti: { id: '1480600503543926965', animated: true },
};

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

function starsLine(guild, count) {
  const star = emojiString(guild, 'star', '⭐');
  return `${star.repeat(count)} (${count}/5)`;
}

module.exports = { EMOJIS, emojiPayload, emojiString, starsLine };
