const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const store = require('../config/store');
const { EMOJIS, emojiPayload } = require('../constants/emojis');

const VOTE_PREFIX = 'suggestion_vote:';
const HEADER_ICON = `https://cdn.discordapp.com/emojis/${EMOJIS.suggestionIcon.id}.webp?size=48&animated=true`;

function voteButtons(messageId, yesCount, noCount) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${VOTE_PREFIX}yes:${messageId}`)
      .setLabel(String(yesCount))
      .setEmoji(emojiPayload('voteYes') || '✅')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`${VOTE_PREFIX}no:${messageId}`)
      .setLabel(String(noCount))
      .setEmoji(emojiPayload('voteNo') || '❌')
      .setStyle(ButtonStyle.Secondary)
  );
}

function suggestionEmbed(guildId, suggestion) {
  const config = store.getGuild(guildId);
  const embed = new EmbedBuilder()
    .setColor(config.brand.color)
    .setAuthor({ name: 'Suggestion', iconURL: HEADER_ICON })
    .setDescription(
      [
        `**Submitted by:** <@${suggestion.authorId}>`,
        '',
        `\`\`\`\n${suggestion.content.slice(0, 3900)}\n\`\`\``,
      ].join('\n')
    )
    .setThumbnail(suggestion.authorAvatar || null);

  if (suggestion.mediaUrl) embed.setImage(suggestion.mediaUrl);

  return embed;
}

function suggestionPayload(guildId, suggestion) {
  const yesCount = suggestion.yes?.length || 0;
  const noCount = suggestion.no?.length || 0;
  return {
    embeds: [suggestionEmbed(guildId, suggestion)],
    components: [voteButtons(suggestion.messageId, yesCount, noCount)],
    allowedMentions: { users: [suggestion.authorId], roles: [] },
  };
}

function isVoteButton(customId) {
  return customId.startsWith(VOTE_PREFIX);
}

function attachmentMedia(message) {
  const attachment = message.attachments.first();
  if (!attachment) return null;
  const type = attachment.contentType || '';
  const name = attachment.name || '';
  const isVideo = type.startsWith('video/') || /\.(mp4|mov|webm|mkv)$/i.test(name);
  const isImage = type.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(name);
  if (!isImage && !isVideo) return null;
  return attachment.url;
}

function applyVote(suggestion, userId, vote) {
  const hadYes = (suggestion.yes || []).includes(userId);
  const hadNo = (suggestion.no || []).includes(userId);

  suggestion.yes = (suggestion.yes || []).filter((id) => id !== userId);
  suggestion.no = (suggestion.no || []).filter((id) => id !== userId);

  if (vote === 'yes' && !hadYes) suggestion.yes.push(userId);
  if (vote === 'no' && !hadNo) suggestion.no.push(userId);

  return suggestion;
}

async function createFromMessage(message) {
  const config = store.getGuild(message.guild.id);
  if (message.channelId !== config.channels.suggestions) return null;

  const content = message.content?.trim();
  const mediaUrl = attachmentMedia(message);
  if (!content && !mediaUrl) return null;

  const suggestion = {
    guildId: message.guild.id,
    channelId: message.channelId,
    messageId: 'pending',
    authorId: message.author.id,
    authorAvatar: message.author.displayAvatarURL({ extension: 'png', size: 256 }),
    content: content || 'Media suggestion',
    mediaUrl,
    yes: [],
    no: [],
    createdAt: Date.now(),
  };

  const sent = await message.channel.send({
    embeds: [suggestionEmbed(message.guild.id, suggestion)],
    allowedMentions: { users: [message.author.id], roles: [] },
  });
  suggestion.messageId = sent.id;
  store.setSuggestion(sent.id, suggestion);

  await message.delete().catch(() => null);
  await sent.edit(suggestionPayload(message.guild.id, suggestion)).catch(() => null);
  return sent;
}

async function handleVote(interaction) {
  const [, vote, messageId] = interaction.customId.split(':');
  if (!['yes', 'no'].includes(vote)) {
    return interaction.reply({ content: 'Invalid vote.', ephemeral: true });
  }

  const suggestion = store.getSuggestion(messageId);
  if (!suggestion) {
    return interaction.reply({ content: 'This suggestion is no longer available.', ephemeral: true });
  }

  const userId = interaction.user.id;
  applyVote(suggestion, userId, vote);
  store.setSuggestion(messageId, suggestion);

  return interaction.update(suggestionPayload(interaction.guild.id, suggestion));
}

module.exports = {
  VOTE_PREFIX,
  isVoteButton,
  createFromMessage,
  handleVote,
  suggestionPayload,
};
