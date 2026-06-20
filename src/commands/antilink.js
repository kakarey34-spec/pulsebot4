const { SlashCommandBuilder } = require('discord.js');
const store = require('../config/store');
const { LEVELS } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antilink')
    .setDescription('Enable or disable anti-link')
    .addBooleanOption((opt) => opt.setName('enabled').setDescription('Enabled').setRequired(true)),
  permissionLevel: LEVELS.mod,
  permissionLabel: 'mod',
  async execute(interaction) {
    const enabled = interaction.options.getBoolean('enabled');
    store.setGuild(interaction.guild.id, { antiLink: { enabled } });
    return interaction.reply({ content: `Anti-link ${enabled ? 'enabled' : 'disabled'}.`, ephemeral: true });
  },
};
