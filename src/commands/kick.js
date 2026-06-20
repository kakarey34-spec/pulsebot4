const { SlashCommandBuilder } = require('discord.js');
const { LEVELS } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user')
    .addUserOption((opt) => opt.setName('user').setDescription('User').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason')),
  permissionLevel: LEVELS.mod,
  permissionLabel: 'mod',
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'Member not found.', ephemeral: true });
    await member.kick(interaction.options.getString('reason') || `Kicked by ${interaction.user.tag}`);
    return interaction.reply({ content: `Kicked **${user.tag}**.`, ephemeral: true });
  },
};
