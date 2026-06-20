const { ChannelType, SlashCommandBuilder } = require('discord.js');
const store = require('../config/store');
const { LEVELS } = require('../utils/permissions');
const v2 = require('../utils/v2');

function parseExpires(days) {
  return days ? Date.now() + days * 24 * 60 * 60 * 1000 : null;
}

function promoPayload(guildId, promo) {
  const config = store.getGuild(guildId);
  const lines = [
    `## Pulse Studio Promocode`,
    `Code: \`${promo.code}\``,
    `Discount: **${promo.discountPercent}% off**`,
  ];
  if (promo.maxUses) lines.push(`Uses: **${promo.uses || 0}/${promo.maxUses}**`);
  if (promo.expiresAt) lines.push(`Expires: <t:${Math.floor(promo.expiresAt / 1000)}:R>`);
  lines.push('', 'Use this code inside a purchase ticket before selecting your payment method.');
  return v2.message(v2.container([v2.text(lines.join('\n'))], config.brand.color));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promo')
    .setDescription('Manage discount-only promocodes')
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Create or update a discount code')
        .addStringOption((opt) => opt.setName('code').setDescription('Code').setRequired(true).setMaxLength(32))
        .addIntegerOption((opt) => opt.setName('discount').setDescription('Discount percent').setRequired(true).setMinValue(1).setMaxValue(100))
        .addIntegerOption((opt) => opt.setName('max_uses').setDescription('Optional use limit').setMinValue(1))
        .addIntegerOption((opt) => opt.setName('expires_days').setDescription('Optional expiry in days').setMinValue(1))
        .addChannelOption((opt) => opt.setName('channel').setDescription('Post promo embed to this channel').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('List promocodes'))
    .addSubcommand((sub) =>
      sub
        .setName('post')
        .setDescription('Post a promocode embed')
        .addStringOption((opt) => opt.setName('code').setDescription('Code').setRequired(true))
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    )
    .addSubcommand((sub) =>
      sub
        .setName('delete')
        .setDescription('Delete a promocode')
        .addStringOption((opt) => opt.setName('code').setDescription('Code').setRequired(true))
    ),
  permissionLevel: LEVELS.seller,
  permissionLabel: 'seller',
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'create') {
      const promo = {
        code: interaction.options.getString('code').toUpperCase(),
        discountPercent: interaction.options.getInteger('discount'),
        maxUses: interaction.options.getInteger('max_uses'),
        expiresAt: parseExpires(interaction.options.getInteger('expires_days')),
        uses: 0,
        enabled: true,
        updatedBy: interaction.user.id,
        updatedAt: Date.now(),
      };
      store.upsertPromo(interaction.guild.id, promo);
      const channel = interaction.options.getChannel('channel');
      if (channel) await channel.send(promoPayload(interaction.guild.id, promo));
      return interaction.reply({ content: `Promocode \`${promo.code}\` saved.`, ephemeral: true });
    }
    if (sub === 'list') {
      const promos = store.listPromos(interaction.guild.id);
      if (!promos.length) return interaction.reply({ content: 'No promocodes saved.', ephemeral: true });
      return interaction.reply({
        content: promos.map((p) => `\`${p.code}\` - ${p.discountPercent}% - uses ${p.uses || 0}${p.maxUses ? `/${p.maxUses}` : ''}`).join('\n'),
        ephemeral: true,
      });
    }
    if (sub === 'post') {
      const promo = store.getPromo(interaction.guild.id, interaction.options.getString('code'));
      if (!promo) return interaction.reply({ content: 'Promocode not found.', ephemeral: true });
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      await channel.send(promoPayload(interaction.guild.id, promo));
      return interaction.reply({ content: `Posted \`${promo.code}\` in ${channel}.`, ephemeral: true });
    }
    const code = interaction.options.getString('code').toUpperCase();
    store.deletePromo(interaction.guild.id, code);
    return interaction.reply({ content: `Deleted promocode \`${code}\`.`, ephemeral: true });
  },
};
