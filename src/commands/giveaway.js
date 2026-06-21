const { ChannelType, SlashCommandBuilder } = require('discord.js');
const { parseDuration } = require('../utils/parseDuration');
const { LEVELS } = require('../utils/permissions');
const store = require('../config/store');
const giveawayService = require('../services/giveawayService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Create and manage giveaways')
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('Start a giveaway')
        .addStringOption((opt) => opt.setName('title').setDescription('Title').setRequired(true).setMaxLength(100))
        .addStringOption((opt) => opt.setName('prize').setDescription('Prize').setRequired(true).setMaxLength(200))
        .addStringOption((opt) => opt.setName('duration').setDescription('30m, 1h, 2d, 1w').setRequired(true))
        .addIntegerOption((opt) => opt.setName('winners').setDescription('Winner count').setMinValue(1).setMaxValue(giveawayService.MAX_WINNERS))
        .addChannelOption((opt) => opt.setName('channel').setDescription('Giveaway channel').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
        .addStringOption((opt) => opt.setName('description').setDescription('Extra details').setMaxLength(500))
        .addStringOption((opt) => opt.setName('media_url').setDescription('Banner image or video URL'))
        .addAttachmentOption((opt) => opt.setName('media').setDescription('Upload a banner image or video'))
    )
    .addSubcommand((sub) =>
      sub.setName('end').setDescription('End a giveaway').addStringOption((opt) => opt.setName('message_id').setDescription('Message ID').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('reroll')
        .setDescription('Reroll an ended giveaway winner')
        .addStringOption((opt) => opt.setName('message_id').setDescription('Message ID').setRequired(true))
        .addUserOption((opt) => opt.setName('user').setDescription('Winner to replace').setRequired(true))
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('List active giveaways')),
  permissionLevel: LEVELS.mod,
  permissionLabel: 'mod',
  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'start') {
      const durationMs = parseDuration(interaction.options.getString('duration'));
      if (!durationMs) return interaction.reply({ content: 'Invalid duration. Use `30m`, `1h`, `2d`, or `1w`.', ephemeral: true });
      await interaction.deferReply({ ephemeral: true });
      const result = await giveawayService.startGiveaway(interaction, {
        title: interaction.options.getString('title'),
        prize: interaction.options.getString('prize'),
        description: interaction.options.getString('description'),
        mediaUrl: interaction.options.getString('media_url'),
        attachment: interaction.options.getAttachment('media'),
        durationMs,
        winnerCount: interaction.options.getInteger('winners') || 1,
        channel: interaction.options.getChannel('channel') || interaction.channel,
      });
      return interaction.editReply({ content: `Giveaway started: ${result.message.url}` });
    }
    if (sub === 'end') {
      await interaction.deferReply({ ephemeral: true });
      const result = await giveawayService.endGiveaway(client, interaction.options.getString('message_id'), true);
      return interaction.editReply({ content: result.error || 'Giveaway ended.' });
    }
    if (sub === 'reroll') {
      await interaction.deferReply({ ephemeral: true });
      const result = await giveawayService.rerollGiveaway(client, interaction.options.getString('message_id'), interaction.options.getUser('user').id);
      return interaction.editReply({ content: result.error || `New winner: <@${result.newWinner}>` });
    }
    const active = store.listActiveGiveaways().filter((g) => g.guildId === interaction.guild.id);
    if (!active.length) return interaction.reply({ content: 'No active giveaways.', ephemeral: true });
    return interaction.reply({
      content: active.map((g) => `\`${g.messageId}\` - **${g.title}** ends <t:${Math.floor(g.endsAt / 1000)}:R>`).join('\n'),
      ephemeral: true,
    });
  },
};
