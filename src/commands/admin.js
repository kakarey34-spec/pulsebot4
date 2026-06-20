const { ChannelType, SlashCommandBuilder } = require('discord.js');
const store = require('../config/store');
const { LEVELS } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Basic admin and configuration commands')
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
    )
    .addSubcommand((sub) =>
      sub
        .setName('antilink')
        .setDescription('Enable or disable anti-link')
        .addBooleanOption((opt) => opt.setName('enabled').setDescription('Enabled').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('ban')
        .setDescription('Ban a user')
        .addUserOption((opt) => opt.setName('user').setDescription('User').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason'))
    )
    .addSubcommand((sub) =>
      sub
        .setName('kick')
        .setDescription('Kick a user')
        .addUserOption((opt) => opt.setName('user').setDescription('User').setRequired(true))
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason'))
    )
    .addSubcommand((sub) =>
      sub
        .setName('clear')
        .setDescription('Bulk delete messages')
        .addIntegerOption((opt) => opt.setName('amount').setDescription('1-100').setRequired(true).setMinValue(1).setMaxValue(100))
    ),
  permissionLevel: LEVELS.mod,
  permissionLabel: 'mod',
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'setlog') {
      const type = interaction.options.getString('type');
      const channel = interaction.options.getChannel('channel');
      store.setGuild(interaction.guild.id, { channels: { [type]: channel.id } });
      return interaction.reply({ content: `${type} set to ${channel}.`, ephemeral: true });
    }
    if (sub === 'antilink') {
      store.setGuild(interaction.guild.id, { antiLink: { enabled: interaction.options.getBoolean('enabled') } });
      return interaction.reply({ content: `Anti-link ${interaction.options.getBoolean('enabled') ? 'enabled' : 'disabled'}.`, ephemeral: true });
    }
    if (sub === 'ban') {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || `Banned by ${interaction.user.tag}`;
      await interaction.guild.members.ban(user.id, { reason });
      return interaction.reply({ content: `Banned **${user.tag}**.`, ephemeral: true });
    }
    if (sub === 'kick') {
      const user = interaction.options.getUser('user');
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ content: 'Member not found.', ephemeral: true });
      await member.kick(interaction.options.getString('reason') || `Kicked by ${interaction.user.tag}`);
      return interaction.reply({ content: `Kicked **${user.tag}**.`, ephemeral: true });
    }
    const amount = interaction.options.getInteger('amount');
    const deleted = await interaction.channel.bulkDelete(amount, true);
    return interaction.reply({ content: `Deleted ${deleted.size} message(s).`, ephemeral: true });
  },
};
