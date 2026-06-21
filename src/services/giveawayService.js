const store = require('../config/store');
const v2 = require('../utils/v2');
const { emojiPayload } = require('../constants/emojis');

const ENTER_PREFIX = 'giveaway_enter:';
const MAX_WINNERS = 20;

function isEnterButton(customId) {
  return customId.startsWith(ENTER_PREFIX);
}

function payload(guildId, giveaway) {
  const config = store.getGuild(guildId);
  const entries = giveaway.entries?.length || 0;
  const ended = giveaway.status === 'ended';
  const winners = giveaway.winnerIds || [];
  const lines = [
    `## ${giveaway.title}${ended ? ' (Ended)' : ''}`,
    `Prize: **${giveaway.prize}**`,
    `Winners: **${giveaway.winnerCount}**`,
    `Entries: **${entries}**`,
    ended
      ? winners.length
        ? `Winner(s): ${winners.map((id) => `<@${id}>`).join(', ')}`
        : 'No valid entries.'
      : `Ends: <t:${Math.floor(giveaway.endsAt / 1000)}:R>`,
    giveaway.description ? `\n${giveaway.description}` : '',
  ];
  const components = [v2.text(lines.filter(Boolean).join('\n')), v2.separator()];
  if (!ended) {
    components.push(v2.row(v2.button(`${ENTER_PREFIX}${giveaway.messageId}`, 'Enter Giveaway', 1, emojiPayload('confetti') || '🎉')));
  } else {
    components.push(v2.row(v2.button(`${ENTER_PREFIX}${giveaway.messageId}`, 'Giveaway Ended', 2, emojiPayload('confetti') || '🎉', true)));
  }
  return v2.message(v2.container(components, config.brand.color), {
    allowedMentions: ended ? { users: winners } : { parse: [] },
  });
}

async function startGiveaway(interaction, options) {
  const endsAt = Date.now() + options.durationMs;
  const temp = {
    guildId: interaction.guild.id,
    channelId: options.channel.id,
    messageId: 'pending',
    title: options.title,
    prize: options.prize,
    description: options.description,
    winnerCount: options.winnerCount,
    endsAt,
    entries: [],
    status: 'active',
    createdBy: interaction.user.id,
  };
  const message = await options.channel.send(payload(interaction.guild.id, temp));
  temp.messageId = message.id;
  store.setGiveaway(message.id, temp);
  await message.edit(payload(interaction.guild.id, temp)).catch(() => null);
  return { message, giveaway: temp };
}

async function handleEnter(interaction) {
  const messageId = interaction.customId.slice(ENTER_PREFIX.length);
  const giveaway = store.getGiveaway(messageId);
  if (!giveaway || giveaway.status !== 'active') {
    return interaction.reply({ content: 'This giveaway is no longer active.', ephemeral: true });
  }
  if (giveaway.entries.includes(interaction.user.id)) {
    return interaction.reply({ content: 'You are already entered.', ephemeral: true });
  }
  giveaway.entries.push(interaction.user.id);
  store.setGiveaway(messageId, giveaway);
  await interaction.update(payload(interaction.guild.id, giveaway)).catch(async () => {
    await interaction.reply({ content: 'You entered the giveaway.', ephemeral: true });
  });
}

function pickWinners(entries, count, exclude = []) {
  const pool = [...new Set(entries)].filter((id) => !exclude.includes(id));
  const winners = [];
  while (pool.length && winners.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(index, 1)[0]);
  }
  return winners;
}

async function endGiveaway(client, messageId, forced = false) {
  const giveaway = store.getGiveaway(messageId);
  if (!giveaway || giveaway.status !== 'active') return { error: 'Giveaway not found.' };
  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (!channel?.isTextBased()) return { error: 'Giveaway channel not found.' };
  const winners = pickWinners(giveaway.entries || [], giveaway.winnerCount);
  giveaway.status = 'ended';
  giveaway.endedAt = Date.now();
  giveaway.winnerIds = winners;
  store.setGiveaway(messageId, giveaway);
  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (message) await message.edit(payload(giveaway.guildId, giveaway)).catch(() => null);
  await channel.send({
    content: winners.length
      ? winners.length === 1
        ? `🎉 Congratulations <@${winners[0]}>, you won **${giveaway.prize}**!`
        : `🎉 Giveaway ended${forced ? ' early' : ''}! Winners: ${winners.map((id) => `<@${id}>`).join(', ')} — you won **${giveaway.prize}**!`
      : `Giveaway ended${forced ? ' early' : ''}. No valid entries.`,
    allowedMentions: { users: winners },
  });
  return { winners };
}

async function rerollGiveaway(client, messageId, replacedUserId) {
  const giveaway = store.getGiveaway(messageId);
  if (!giveaway || giveaway.status !== 'ended') return { error: 'Ended giveaway not found.' };
  const current = giveaway.winnerIds || [];
  const winners = pickWinners(giveaway.entries || [], 1, current);
  if (!winners.length) return { error: 'No replacement entries available.' };
  giveaway.winnerIds = current.map((id) => (id === replacedUserId ? winners[0] : id));
  store.setGiveaway(messageId, giveaway);
  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (channel?.isTextBased()) {
    await channel.send({
      content: `Giveaway rerolled: <@${replacedUserId}> -> <@${winners[0]}>`,
      allowedMentions: { users: [replacedUserId, winners[0]] },
    });
  }
  return { newWinner: winners[0], replaced: replacedUserId };
}

async function processDueGiveaways(client) {
  for (const giveaway of store.listDueGiveaways()) {
    await endGiveaway(client, giveaway.messageId).catch((error) =>
      console.warn('Giveaway end failed:', error.message)
    );
  }
}

function startScheduler(client) {
  processDueGiveaways(client).catch((error) => console.warn('Giveaway startup check failed:', error.message));
  setInterval(() => {
    processDueGiveaways(client).catch((error) => console.warn('Giveaway scheduler failed:', error.message));
  }, 30_000).unref();
}

module.exports = {
  MAX_WINNERS,
  isEnterButton,
  startGiveaway,
  handleEnter,
  endGiveaway,
  rerollGiveaway,
  startScheduler,
};
