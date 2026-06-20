const { ChannelType, SlashCommandBuilder } = require('discord.js');
const store = require('../config/store');
const { LEVELS } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Admin configuration commands')
    .addSubcommand((sub) =>
      sub
        .setName('setlog')
        .setDescription('Set a log channel')
        .addStringOption((opt) =>
          opt
            .setName('type')
            .setDescription('Log type')
            .setRequired(true)
            .addChoices(
              { name: 'member', value: 'memberLogs' },
              { name: 'channel', value: 'channelLogs' },
              { name: 'role', value: 'roleLogs' },
              { name: 'voice', value: 'voiceLogs' },
              { name: 'moderation', value: 'moderationLogs' },
              { name: 'ticket', value: 'ticketLogs' },
              { name: 'antilink', value: 'antiLinkLogs' },
              { name: 'commands', value: 'commandLogs' },
              { name: 'security', value: 'securityLogs' },
              { name: 'server', value: 'serverLogs' },
              { name: 'review', value: 'review' }
            )
        )
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel').setRequired(true).addChannelTypes(ChannelType.GuildText))
    ),
  permissionLevel: LEVELS.mod,
  permissionLabel: 'mod',
  async execute(interaction) {
    const type = interaction.options.getString('type');
    const channel = interaction.options.getChannel('channel');
    store.setGuild(interaction.guild.id, { channels: { [type]: channel.id } });
    return interaction.reply({ content: `${type} set to ${channel}.`, ephemeral: true });
  },
};
