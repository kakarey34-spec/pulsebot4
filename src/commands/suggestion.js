const { ChannelType, SlashCommandBuilder } = require('discord.js');
const store = require('../config/store');
const { LEVELS } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggestion')
    .setDescription('Configure suggestion reactions')
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Set the suggestion channel')
        .addChannelOption((opt) => opt.setName('channel').setDescription('Suggestion channel').setRequired(true).addChannelTypes(ChannelType.GuildText))
    ),
  permissionLevel: LEVELS.mod,
  permissionLabel: 'mod',
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    store.setGuild(interaction.guild.id, { channels: { suggestions: channel.id } });
    return interaction.reply({ content: `Suggestion channel set to ${channel}.`, ephemeral: true });
  },
};
