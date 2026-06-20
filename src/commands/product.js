const { ChannelType, SlashCommandBuilder } = require('discord.js');
const crypto = require('crypto');
const store = require('../config/store');
const { LEVELS } = require('../utils/permissions');
const v2 = require('../utils/v2');

function productPayload(guildId, product) {
  const config = store.getGuild(guildId);
  const mediaUrl = product.mediaUrl || product.imageUrl;
  const isVideo = product.mediaType === 'video';
  const mediaLine = mediaUrl
    ? isVideo
      ? `Product video: ${mediaUrl}`
      : `Product image: ${mediaUrl}`
    : null;
  return v2.message(
    v2.container([
      v2.text(`## ${product.name}\nProduct ID: \`${product.id}\`\nPrice: **€${product.price.toFixed(2)}**`),
      mediaUrl && !isVideo ? v2.media(mediaUrl, product.name) : null,
      v2.separator(),
      v2.text(product.description || '_No description provided._'),
      mediaLine ? v2.text(mediaLine) : null,
      mediaUrl ? v2.row(v2.linkButton(mediaUrl, isVideo ? 'Open Video' : 'Open Image', isVideo ? '🎬' : '🖼️')) : null,
      v2.text('Open a **Purchase Ticket** and enter this product ID first.'),
      v2.text(`-# ${config.brand.footer}`),
    ], config.brand.color)
  );
}

function attachmentMedia(attachment) {
  if (!attachment) return { mediaUrl: null, mediaType: null };
  const type = attachment.contentType || '';
  const name = attachment.name || '';
  const isVideo = type.startsWith('video/') || /\.(mp4|mov|webm|mkv)$/i.test(name);
  const isImage = type.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(name);
  return {
    mediaUrl: attachment.url,
    mediaType: isVideo ? 'video' : isImage ? 'image' : 'file',
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('product')
    .setDescription('Manage available shop products')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add or update a product')
        .addStringOption((opt) => opt.setName('name').setDescription('Product name').setRequired(true).setMaxLength(100))
        .addNumberOption((opt) => opt.setName('price').setDescription('Price in EUR').setRequired(true).setMinValue(0))
        .addStringOption((opt) => opt.setName('description').setDescription('Detailed description').setRequired(true).setMaxLength(1500))
        .addStringOption((opt) => opt.setName('id').setDescription('Custom product ID').setMaxLength(40))
        .addStringOption((opt) => opt.setName('media_url').setDescription('Image/video URL for the product'))
        .addAttachmentOption((opt) => opt.setName('media').setDescription('Upload a product photo or video'))
        .addChannelOption((opt) => opt.setName('channel').setDescription('Post listing to this channel').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('List product IDs'))
    .addSubcommand((sub) =>
      sub
        .setName('post')
        .setDescription('Post an existing product listing')
        .addStringOption((opt) => opt.setName('id').setDescription('Product ID').setRequired(true))
        .addChannelOption((opt) => opt.setName('channel').setDescription('Listing channel').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a product')
        .addStringOption((opt) => opt.setName('id').setDescription('Product ID').setRequired(true))
    ),
  permissionLevel: LEVELS.seller,
  permissionLabel: 'seller',
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const id = (interaction.options.getString('id') || `PULSE-${crypto.randomBytes(3).toString('hex')}`).toUpperCase();
      const attachment = interaction.options.getAttachment('media');
      const uploaded = attachmentMedia(attachment);
      const mediaUrl = uploaded.mediaUrl || interaction.options.getString('media_url');
      const mediaType = uploaded.mediaType || (mediaUrl ? (/(\.mp4|\.mov|\.webm|\.mkv)(\?|$)/i.test(mediaUrl) ? 'video' : 'image') : null);
      const product = {
        id,
        name: interaction.options.getString('name'),
        price: interaction.options.getNumber('price'),
        description: interaction.options.getString('description'),
        mediaUrl,
        mediaType,
        updatedBy: interaction.user.id,
        updatedAt: Date.now(),
      };
      store.upsertProduct(interaction.guild.id, product);
      const channel = interaction.options.getChannel('channel');
      if (channel) await channel.send(productPayload(interaction.guild.id, product));
      return interaction.reply({ content: `Product saved with ID \`${id}\`.`, ephemeral: true });
    }

    if (sub === 'list') {
      const products = store.listProducts(interaction.guild.id);
      if (!products.length) return interaction.reply({ content: 'No products saved yet.', ephemeral: true });
      return interaction.reply({
        content: products.map((p) => `\`${p.id}\` - **${p.name}** - €${p.price.toFixed(2)}`).join('\n'),
        ephemeral: true,
      });
    }

    if (sub === 'post') {
      const product = store.getProduct(interaction.guild.id, interaction.options.getString('id'));
      if (!product) return interaction.reply({ content: 'Product not found.', ephemeral: true });
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      await channel.send(productPayload(interaction.guild.id, product));
      return interaction.reply({ content: `Posted \`${product.id}\` in ${channel}.`, ephemeral: true });
    }

    if (sub === 'remove') {
      const id = interaction.options.getString('id').toUpperCase();
      store.deleteProduct(interaction.guild.id, id);
      return interaction.reply({ content: `Removed product \`${id}\`.`, ephemeral: true });
    }
  },
};
