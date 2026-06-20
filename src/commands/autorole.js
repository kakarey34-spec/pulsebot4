const { SlashCommandBuilder } = require('discord.js');
const store = require('../config/store');
const { LEVELS } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('Set a role given automatically when members join')
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('Set the autorole')
        .addRoleOption((opt) => opt.setName('role').setDescription('Role to give on join').setRequired(true))
    )
    .addSubcommand((sub) => sub.setName('clear').setDescription('Remove the autorole')),
  permissionLevel: LEVELS.mod,
  permissionLabel: 'mod',
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'clear') {
      store.setGuild(interaction.guild.id, { autoRole: { roleId: null } });
      return interaction.reply({ content: 'Autorole cleared.', ephemeral: true });
    }

    const role = interaction.options.getRole('role');
    if (role.managed) {
      return interaction.reply({ content: 'That role is managed by an integration and cannot be used as autorole.', ephemeral: true });
    }
    if (role.id === interaction.guild.id) {
      return interaction.reply({ content: 'You cannot use @everyone as autorole.', ephemeral: true });
    }
    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({
        content: 'That role is above my highest role. Move my role higher in Server Settings.',
        ephemeral: true,
      });
    }

    store.setGuild(interaction.guild.id, { autoRole: { roleId: role.id } });
    return interaction.reply({ content: `Autorole set to **${role.name}**. New members will receive it automatically.`, ephemeral: true });
  },
};
