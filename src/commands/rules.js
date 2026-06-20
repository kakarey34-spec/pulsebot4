const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const store = require('../config/store');
const { LEVELS } = require('../utils/permissions');
const rules = require('../content/rules');

function buildRulesEmbed(guildId) {
  const config = store.getGuild(guildId);
  return new EmbedBuilder()
    .setColor(config.brand.color)
    .setTitle(rules.title)
    .setDescription(rules.description)
    .addFields(rules.fields)
    .setFooter({ text: config.brand.footer });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rules')
    .setDescription('Post the Pulse Studio Terms of Service embed in this channel'),
  permissionLevel: LEVELS.owner,
  permissionLabel: 'owner',
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      await interaction.channel.send({ embeds: [buildRulesEmbed(interaction.guild.id)] });
    } catch (error) {
      console.error('/rules failed:', error);
      return interaction.editReply({
        content: 'Could not post the rules embed. Check bot permissions in this channel.',
      });
    }

    return interaction.editReply({ content: `**Terms of Service** posted in ${interaction.channel}.` });
  },
};
