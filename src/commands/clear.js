const { SlashCommandBuilder } = require('discord.js');
const { LEVELS } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Bulk delete messages')
    .addIntegerOption((opt) => opt.setName('amount').setDescription('1-100').setRequired(true).setMinValue(1).setMaxValue(100)),
  permissionLevel: LEVELS.mod,
  permissionLabel: 'mod',
  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const deleted = await interaction.channel.bulkDelete(amount, true);
    return interaction.reply({ content: `Deleted ${deleted.size} message(s).`, ephemeral: true });
  },
};
