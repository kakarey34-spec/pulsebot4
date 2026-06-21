const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const store = require('../config/store');
const { emojiPayload, resolveEmojiString, starsLine } = require('../constants/emojis');

const REVIEW_OPEN = 'review_open';
const REVIEW_RATE_PREFIX = 'review_rate:';
const REVIEW_SEND_PREFIX = 'review_send:';
const REVIEW_SUBMIT_PREFIX = 'review_submit:';
const BANNER_PATH = path.join(__dirname, '../../assets/pulse-review-banner.png');
const BANNER_NAME = 'pulse-review-banner.png';

function hasBuyerRole(member, config) {
  const buyerRoleId = config.roles.buyer;
  return Boolean(buyerRoleId && member.roles.cache.has(buyerRoleId));
}

function reviewFooterDate() {
  return new Date().toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

async function starDisplay(guild, rating) {
  const active = await resolveEmojiString(guild, 'star', '⭐');
  const inactive = '▫';
  if (rating <= 0) return `${inactive.repeat(5)}\n_No stars selected yet._`;
  return `${active.repeat(rating)}${inactive.repeat(5 - rating)}\n**${rating}/5** stars selected`;
}

function starButtonRows(rating) {
  const starRow = new ActionRowBuilder();
  for (let i = 1; i <= 5; i++) {
    starRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`${REVIEW_RATE_PREFIX}${i}`)
        .setEmoji(emojiPayload('star') || { name: '⭐' })
        .setLabel(String(i))
        .setStyle(rating > 0 && i <= rating ? ButtonStyle.Primary : ButtonStyle.Secondary)
    );
  }

  const sendRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${REVIEW_SEND_PREFIX}${rating}`)
      .setLabel('Send Review')
      .setStyle(ButtonStyle.Success)
      .setDisabled(rating < 1)
  );

  return [starRow, sendRow];
}

async function ratingPayload(guild, rating) {
  const config = store.getGuild(guild.id);
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(config.brand.color)
        .setTitle('Rate Pulse Studio')
        .setDescription(
          [
            'Select your star rating below.',
            '',
            await starDisplay(guild, rating),
            '',
            'When you are ready, press **Send Review** to write your feedback.',
          ].join('\n')
        ),
    ],
    components: starButtonRows(rating),
  };
}

async function reviewPanelPayload(guild, bannerUrl = null) {
  const config = store.getGuild(guild.id);
  const star = await resolveEmojiString(guild, 'star', '⭐');
  const embed = new EmbedBuilder()
    .setColor(config.brand.color)
    .setTitle(`${config.brand.name} Reviews`)
    .setDescription(
      [
        'Share your experience with Pulse Studio.',
        '',
        `Press **Leave a Review** to rate us from 1 to 5 ${star} and tell others how it went.`,
        '',
        '_Only verified buyers can submit a review._',
      ].join('\n')
    );

  if (bannerUrl) embed.setImage(bannerUrl);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(REVIEW_OPEN)
      .setLabel('Leave a Review')
      .setStyle(ButtonStyle.Primary)
      .setEmoji(emojiPayload('star') || { name: '⭐' })
  );

  return { embeds: [embed], components: [row] };
}

async function postPanel(channel) {
  const hasBanner = fs.existsSync(BANNER_PATH);

  if (hasBanner) {
    const sent = await channel.send({
      ...(await reviewPanelPayload(channel.guild, `attachment://${BANNER_NAME}`)),
      files: [{ attachment: BANNER_PATH, name: BANNER_NAME }],
    });
    const bannerUrl = sent.embeds[0]?.image?.url || sent.attachments.first()?.url || null;
    store.setGuild(channel.guild.id, {
      reviews: {
        panelChannelId: channel.id,
        panelMessageId: sent.id,
        bannerUrl,
      },
    });
    return sent;
  }

  const config = store.getGuild(channel.guild.id);
  const storedBannerUrl = config.reviews?.bannerUrl || null;
  const sent = await channel.send(await reviewPanelPayload(channel.guild, storedBannerUrl));
  store.setGuild(channel.guild.id, {
    reviews: { panelChannelId: channel.id, panelMessageId: sent.id, bannerUrl: storedBannerUrl },
  });
  return sent;
}

function wordsModal(stars) {
  const modal = new ModalBuilder()
    .setCustomId(`${REVIEW_SUBMIT_PREFIX}${stars}`)
    .setTitle('Rate our service in words');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('message')
        .setLabel('Your review')
        .setPlaceholder('Tell us about your experience with Pulse Studio.')
        .setStyle(TextInputStyle.Paragraph)
        .setMinLength(3)
        .setMaxLength(1000)
        .setRequired(true)
    )
  );
  return modal;
}

async function denyBuyer(interaction, config) {
  return interaction.reply({
    content: 'Only verified **buyers** can leave a review. Contact staff if you think this is a mistake.',
    ephemeral: true,
  });
}

async function handleOpen(interaction) {
  const config = store.getGuild(interaction.guild.id);
  if (interaction.channelId !== config.channels.reviewPanel) {
    return interaction.reply({ content: `Use the review button in <#${config.channels.reviewPanel}>.`, ephemeral: true });
  }
  if (!hasBuyerRole(interaction.member, config)) return denyBuyer(interaction, config);

  return interaction.reply({
    ...(await ratingPayload(interaction.guild, 0)),
    ephemeral: true,
  });
}

async function handleRate(interaction) {
  const config = store.getGuild(interaction.guild.id);
  if (!hasBuyerRole(interaction.member, config)) return denyBuyer(interaction, config);

  const rating = Number(interaction.customId.slice(REVIEW_RATE_PREFIX.length));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return interaction.reply({ content: 'Invalid star rating.', ephemeral: true });
  }

  return interaction.update(await ratingPayload(interaction.guild, rating));
}

async function handleSend(interaction) {
  const config = store.getGuild(interaction.guild.id);
  if (!hasBuyerRole(interaction.member, config)) return denyBuyer(interaction, config);

  const stars = Number(interaction.customId.slice(REVIEW_SEND_PREFIX.length));
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return interaction.reply({ content: 'Select at least **1 star** before sending your review.', ephemeral: true });
  }

  return interaction.showModal(wordsModal(stars));
}

async function handleSubmit(interaction) {
  const config = store.getGuild(interaction.guild.id);
  if (!hasBuyerRole(interaction.member, config)) {
    return interaction.reply({ content: 'Only verified **buyers** can leave a review.', ephemeral: true });
  }

  const stars = Number(interaction.customId.slice(REVIEW_SUBMIT_PREFIX.length));
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return interaction.reply({ content: 'Invalid star rating.', ephemeral: true });
  }

  const body = interaction.fields.getTextInputValue('message').trim();
  const avatarUrl = interaction.user.displayAvatarURL({ extension: 'png', size: 256 });
  const confetti = await resolveEmojiString(interaction.guild, 'confetti', '🎉');

  const embed = new EmbedBuilder()
    .setColor(config.brand.color)
    .setAuthor({
      name: `${interaction.user.username} left a service rating`,
      iconURL: avatarUrl,
    })
    .setTitle('Service Review')
    .setDescription(body)
    .addFields(
      { name: 'Reviewer', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Stars', value: await starsLine(interaction.guild, stars), inline: true }
    )
    .setThumbnail(avatarUrl)
    .setFooter({
      text: `Review submitted by ${interaction.user.username} • ${reviewFooterDate()}`,
    });

  const reviewPostChannel = await interaction.guild.channels.fetch(config.channels.reviewPost).catch(() => null);
  if (!reviewPostChannel?.isTextBased()) {
    return interaction.reply({ content: 'Review post channel is not configured correctly.', ephemeral: true });
  }

  await reviewPostChannel.send({
    embeds: [embed],
    allowedMentions: { users: [interaction.user.id] },
  });

  return interaction.reply({
    content: `${confetti} Review posted. Thank you for supporting Pulse Studio!`,
    ephemeral: true,
  });
}

function isReviewRate(customId) {
  return customId.startsWith(REVIEW_RATE_PREFIX);
}

function isReviewSend(customId) {
  return customId.startsWith(REVIEW_SEND_PREFIX);
}

function isReviewSubmit(customId) {
  return customId.startsWith(REVIEW_SUBMIT_PREFIX);
}

module.exports = {
  REVIEW_OPEN,
  REVIEW_SUBMIT_PREFIX,
  isReviewRate,
  isReviewSend,
  isReviewSubmit,
  postPanel,
  handleOpen,
  handleRate,
  handleSend,
  handleSubmit,
};
