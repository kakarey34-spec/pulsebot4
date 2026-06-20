const { ChannelType, SlashCommandBuilder } = require('discord.js');
const ticketManager = require('../services/ticketManager');
const store = require('../config/store');
const { LEVELS } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Manage the Pulse Studio ticket system')
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('Post the ticket panel')
        .addChannelOption((opt) => opt.setName('channel').setDescription('Panel channel').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    )
    .addSubcommand((sub) =>
      sub
        .setName('category')
        .setDescription('Set the category where new ticket channels are created')
        .addChannelOption((opt) => opt.setName('category').setDescription('Ticket category').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
    )
    .addSubcommand((sub) => sub.setName('stats').setDescription('Show live active ticket counters')),
  permissionLevel: LEVELS.mod,
  permissionLabel: 'mod',
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'panel') {
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const msg = await ticketManager.postPanel(channel);
      return interaction.reply({ content: `Ticket panel posted: ${msg.url}`, ephemeral: true });
    }
    if (sub === 'category') {
      const category = interaction.options.getChannel('category');
      store.setGuild(interaction.guild.id, { tickets: { categoryId: category.id } });
      return interaction.reply({ content: `Ticket category set to **${category.name}**.`, ephemeral: true });
    }
    const counts = store.ticketCounts(interaction.guild.id);
    return interaction.reply({
      content: `Purchase: **${counts.purchase}** | Support: **${counts.support}** | Partner: **${counts.partner}** | Total: **${counts.total}**`,
      ephemeral: true,
    });
  },
};
