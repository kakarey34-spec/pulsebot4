const { ChannelType, SlashCommandBuilder } = require('discord.js');
const store = require('../config/store');
const reviewService = require('../services/reviewService');
const { LEVELS } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('review')
    .setDescription('Manage Pulse Studio reviews')
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('Post the review panel embed')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Review channel')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
    ),
  permissionLevel: LEVELS.mod,
  permissionLabel: 'mod',
  async execute(interaction) {
    const config = store.getGuild(interaction.guild.id);
    const channel = interaction.options.getChannel('channel')
      || await interaction.guild.channels.fetch(config.channels.review).catch(() => null)
      || interaction.channel;

    if (!channel?.isTextBased()) {
      return interaction.reply({ content: 'Could not find a valid review channel.', ephemeral: true });
    }

    const msg = await reviewService.postPanel(channel);
    return interaction.reply({ content: `Review panel posted: ${msg.url}`, ephemeral: true });
  },
};
