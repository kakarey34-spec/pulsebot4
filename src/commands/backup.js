const { ChannelType, SlashCommandBuilder } = require('discord.js');
const store = require('../config/store');
const backupService = require('../services/backupService');
const { LEVELS } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Manage automatic data backups')
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Set the channel where backups are posted every 10 minutes')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Backup channel').setRequired(true).addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand((sub) => sub.setName('now').setDescription('Send a backup immediately')),
  permissionLevel: LEVELS.mod,
  permissionLabel: 'mod',
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel');
      store.setGuild(interaction.guild.id, { backup: { channelId: channel.id } });
      await backupService.sendBackup(interaction.guild);
      return interaction.reply({
        content: `Backup channel set to ${channel}. Backups run every 10 minutes and restore on redeploy.`,
        ephemeral: true,
      });
    }
    await backupService.sendBackup(interaction.guild);
    return interaction.reply({ content: 'Backup sent.', ephemeral: true });
  },
};
