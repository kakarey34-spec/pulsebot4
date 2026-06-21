const { ChannelType, SlashCommandBuilder } = require('discord.js');
const crypto = require('crypto');
const store = require('../config/store');
const { getProductType, productTypeChoices } = require('../constants/productTypes');
const { LEVELS } = require('../utils/permissions');
const v2 = require('../utils/v2');

function productPayload(guildId, product) {
  const config = store.getGuild(guildId);
  const mediaUrl = product.mediaUrl || product.imageUrl;
  const typeInfo = getProductType(product.type);
  return v2.message(
    v2.container([
      v2.text(`## ${product.name}\nProduct ID: \`${product.id}\`\nPrice: **€${product.price.toFixed(2)}**${typeInfo ? `\nType: **${typeInfo.label}**` : ''}`),
      mediaUrl ? v2.media(mediaUrl, product.name) : null,
      v2.separator(),
      v2.text(product.description || '_No description provided._'),
      v2.text('Open a **Purchase Ticket** and enter this product ID first.'),
    ], config.brand.color)
  );
}

function attachmentMedia(attachment) {
  if (!attachment) return { mediaUrl: null, mediaType: null };
  const type = attachment.contentType || '';
  const name = attachment.name || '';
  const isVideo = type.startsWith('video/') || /\.(mp4|mov|webm|mkv)$/i.test(name);
  const isImage = type.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(name);
  if (!isVideo && !isImage) return { mediaUrl: null, mediaType: null };
  return {
    mediaUrl: attachment.url,
    mediaType: isVideo ? 'video' : 'image',
  };
}

function mediaFromUrl(url) {
  if (!url) return { mediaUrl: null, mediaType: null };
  const isVideo = /\.(mp4|mov|webm|mkv)(\?|$)/i.test(url);
  return { mediaUrl: url, mediaType: isVideo ? 'video' : 'image' };
}

async function postProductToForum(guild, product) {
  const typeInfo = getProductType(product.type);
  if (!typeInfo) throw new Error('Product type is missing or invalid.');

  const forum = await guild.channels.fetch(typeInfo.forumId);
  if (!forum || forum.type !== ChannelType.GuildForum) {
    throw new Error(`Forum channel \`${typeInfo.forumId}\` for **${typeInfo.label}** was not found.`);
  }

  const thread = await forum.threads.create({
    name: product.name.slice(0, 100),
    message: productPayload(guild.id, product),
  });
  return { forum, thread };
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
        .addStringOption((opt) =>
          opt
            .setName('type')
            .setDescription('Product category (determines listing forum)')
            .setRequired(true)
            .addChoices(...productTypeChoices())
        )
        .addStringOption((opt) => opt.setName('id').setDescription('Custom product ID').setMaxLength(40))
        .addStringOption((opt) => opt.setName('media_url').setDescription('Photo or video URL'))
        .addAttachmentOption((opt) => opt.setName('media').setDescription('Upload a product photo or video'))
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('List product IDs'))
    .addSubcommand((sub) =>
      sub
        .setName('post')
        .setDescription('Post an existing product listing')
        .addStringOption((opt) => opt.setName('id').setDescription('Product ID').setRequired(true))
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
      const type = interaction.options.getString('type');
      const typeInfo = getProductType(type);
      if (!typeInfo) return interaction.reply({ content: 'Invalid product type.', ephemeral: true });

      const id = (interaction.options.getString('id') || `PULSE-${crypto.randomBytes(3).toString('hex')}`).toUpperCase();
      const uploaded = attachmentMedia(interaction.options.getAttachment('media'));
      const fromUrl = mediaFromUrl(interaction.options.getString('media_url'));
      const mediaUrl = uploaded.mediaUrl || fromUrl.mediaUrl;
      const mediaType = uploaded.mediaType || fromUrl.mediaType;
      const product = {
        id,
        name: interaction.options.getString('name'),
        price: interaction.options.getNumber('price'),
        description: interaction.options.getString('description'),
        type,
        mediaUrl,
        mediaType,
        updatedBy: interaction.user.id,
        updatedAt: Date.now(),
      };
      store.upsertProduct(interaction.guild.id, product);

      try {
        const { thread } = await postProductToForum(interaction.guild, product);
        return interaction.reply({
          content: `Product saved with ID \`${id}\` and posted to **${typeInfo.label}** forum: ${thread}.`,
          ephemeral: true,
        });
      } catch (error) {
        return interaction.reply({
          content: `Product saved with ID \`${id}\`, but posting failed: ${error.message}`,
          ephemeral: true,
        });
      }
    }

    if (sub === 'list') {
      const products = store.listProducts(interaction.guild.id);
      if (!products.length) return interaction.reply({ content: 'No products saved yet.', ephemeral: true });
      return interaction.reply({
        content: products
          .map((p) => {
            const typeInfo = getProductType(p.type);
            const typeLabel = typeInfo ? typeInfo.label : 'Unknown';
            return `\`${p.id}\` - **${p.name}** - €${p.price.toFixed(2)} - ${typeLabel}`;
          })
          .join('\n'),
        ephemeral: true,
      });
    }

    if (sub === 'post') {
      const product = store.getProduct(interaction.guild.id, interaction.options.getString('id'));
      if (!product) return interaction.reply({ content: 'Product not found.', ephemeral: true });
      const typeInfo = getProductType(product.type);
      if (!typeInfo) {
        return interaction.reply({ content: 'This product has no valid type. Re-add it with `/product add`.', ephemeral: true });
      }

      try {
        const { thread } = await postProductToForum(interaction.guild, product);
        return interaction.reply({ content: `Posted \`${product.id}\` to **${typeInfo.label}** forum: ${thread}.`, ephemeral: true });
      } catch (error) {
        return interaction.reply({ content: `Failed to post product: ${error.message}`, ephemeral: true });
      }
    }

    if (sub === 'remove') {
      const id = interaction.options.getString('id').toUpperCase();
      store.deleteProduct(interaction.guild.id, id);
      return interaction.reply({ content: `Removed product \`${id}\`.`, ephemeral: true });
    }
  },
};
