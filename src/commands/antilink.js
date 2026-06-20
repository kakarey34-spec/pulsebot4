const { SlashCommandBuilder } = require('discord.js');
const store = require('../config/store');
const { LEVELS } = require('../utils/permissions');

function authorizedUsers(config) {
  return config.antiLink.authorizedUserIds || [];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antilink')
    .setDescription('Manage anti-link protection')
    .addSubcommand((sub) =>
      sub
        .setName('enable')
        .setDescription('Enable or disable anti-link')
        .addBooleanOption((opt) => opt.setName('enabled').setDescription('Enabled').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('auth')
        .setDescription('Authorize a user to post links')
        .addUserOption((opt) => opt.setName('user').setDescription('User to authorize').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('unauth')
        .setDescription('Remove link authorization from a user')
        .addUserOption((opt) => opt.setName('user').setDescription('User to unauthorize').setRequired(true))
    ),
  permissionLevel: LEVELS.mod,
  permissionLabel: 'mod',
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const config = store.getGuild(interaction.guild.id);

    if (sub === 'enable') {
      const enabled = interaction.options.getBoolean('enabled');
      store.setGuild(interaction.guild.id, { antiLink: { enabled } });
      return interaction.reply({ content: `Anti-link ${enabled ? 'enabled' : 'disabled'}.`, ephemeral: true });
    }

    if (sub === 'auth') {
      const user = interaction.options.getUser('user');
      const ids = [...new Set([...authorizedUsers(config), user.id])];
      store.setGuild(interaction.guild.id, { antiLink: { authorizedUserIds: ids } });
      return interaction.reply({ content: `<@${user.id}> can now post links.`, ephemeral: true });
    }

    const user = interaction.options.getUser('user');
    const ids = authorizedUsers(config).filter((id) => id !== user.id);
    store.setGuild(interaction.guild.id, { antiLink: { authorizedUserIds: ids } });
    return interaction.reply({ content: `<@${user.id}> is no longer authorized to post links.`, ephemeral: true });
  },
};
