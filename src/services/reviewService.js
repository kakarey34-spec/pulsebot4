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
const REVIEW_SUBMIT = 'review_submit';
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
  const bannerUrl = hasBanner ? `attachment://${BANNER_NAME}` : null;
  const sent = await channel.send({
    ...(await reviewPanelPayload(channel.guild, bannerUrl)),
    files: hasBanner ? [{ attachment: BANNER_PATH, name: BANNER_NAME }] : [],
  });
  const uploadedBannerUrl = sent.embeds[0]?.image?.url || null;
  store.setGuild(channel.guild.id, {
    reviews: { panelChannelId: channel.id, panelMessageId: sent.id, bannerUrl: uploadedBannerUrl },
  });
  if (uploadedBannerUrl) {
    await sent.edit(await reviewPanelPayload(channel.guild, uploadedBannerUrl)).catch(() => null);
  }
  return sent;
}

function openModal() {
  const modal = new ModalBuilder().setCustomId(REVIEW_SUBMIT).setTitle('Leave a Review');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('stars')
        .setLabel('Stars (1 to 5)')
        .setPlaceholder('Example: 5')
        .setStyle(TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(1)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('message')
        .setLabel('Your review')
        .setPlaceholder('Tell us about your experience.')
        .setStyle(TextInputStyle.Paragraph)
        .setMinLength(3)
        .setMaxLength(1000)
        .setRequired(true)
    )
  );
  return modal;
}

async function handleOpen(interaction) {
  const config = store.getGuild(interaction.guild.id);
  if (interaction.channelId !== config.channels.review) {
    return interaction.reply({ content: `Use the review button in <#${config.channels.review}>.`, ephemeral: true });
  }
  if (!hasBuyerRole(interaction.member, config)) {
    return interaction.reply({
      content: 'Only verified **buyers** can leave a review. Contact staff if you think this is a mistake.',
      ephemeral: true,
    });
  }
  return interaction.showModal(openModal());
}

async function handleSubmit(interaction) {
  const config = store.getGuild(interaction.guild.id);
  if (!hasBuyerRole(interaction.member, config)) {
    return interaction.reply({ content: 'Only verified **buyers** can leave a review.', ephemeral: true });
  }

  const starsRaw = interaction.fields.getTextInputValue('stars').trim();
  const stars = Number(starsRaw);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return interaction.reply({ content: 'Stars must be a whole number from **1** to **5**.', ephemeral: true });
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

  const postChannelId = config.channels.reviewPost || config.channels.review;
  const reviewPostChannel = await interaction.guild.channels.fetch(postChannelId).catch(() => null);
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

module.exports = {
  REVIEW_OPEN,
  REVIEW_SUBMIT,
  postPanel,
  handleOpen,
  handleSubmit,
};
