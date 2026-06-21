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
    const panelChannel = interaction.options.getChannel('channel')
      || await interaction.guild.channels.fetch(config.channels.reviewPanel).catch(() => null);

    if (!panelChannel?.isTextBased()) {
      return interaction.reply({
        content: `Could not find the review panel channel <#${config.channels.reviewPanel}>.`,
        ephemeral: true,
      });
    }

    const msg = await reviewService.postPanel(panelChannel);
    return interaction.reply({
      content: `Review panel posted in <#${config.channels.reviewPanel}>. Reviews will be sent to <#${config.channels.reviewPost}>.\n${msg.url}`,
      ephemeral: true,
    });
  },
};
