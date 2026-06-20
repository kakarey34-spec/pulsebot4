const { SlashCommandBuilder } = require('discord.js');
const { LEVELS } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user')
    .addUserOption((opt) => opt.setName('user').setDescription('User').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason')),
  permissionLevel: LEVELS.mod,
  permissionLabel: 'mod',
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || `Banned by ${interaction.user.tag}`;
    await interaction.guild.members.ban(user.id, { reason });
    return interaction.reply({ content: `Banned **${user.tag}**.`, ephemeral: true });
  },
};
