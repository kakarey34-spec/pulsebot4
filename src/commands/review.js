const { SlashCommandBuilder } = require('discord.js');
const store = require('../config/store');
const v2 = require('../utils/v2');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('review')
    .setDescription('Leave a Pulse Studio review')
    .addIntegerOption((opt) => opt.setName('stars').setDescription('1 to 5 stars').setRequired(true).setMinValue(1).setMaxValue(5))
    .addStringOption((opt) => opt.setName('message').setDescription('Your review').setRequired(true).setMaxLength(1000)),
  async execute(interaction) {
    const config = store.getGuild(interaction.guild.id);
    if (interaction.channelId !== config.channels.review) {
      return interaction.reply({ content: `Please use reviews in <#${config.channels.review}>.`, ephemeral: true });
    }
    const stars = interaction.options.getInteger('stars');
    const body = interaction.options.getString('message');
    const avatarUrl = interaction.user.displayAvatarURL({ extension: 'png', size: 256 });
    const starLine = `${'⭐'.repeat(stars)}${'☆'.repeat(5 - stars)} **${stars}/5**`;
    await interaction.channel.send(
      v2.message(
        v2.container([
          v2.media(avatarUrl, `${interaction.user.username}'s avatar`),
          v2.text(`## Pulse Studios Review\n${starLine}`),
          v2.separator(),
          v2.text(`> ${body.replace(/\n/g, '\n> ')}`),
          v2.text(`**${interaction.user.username}** | ${config.brand.footer}`),
        ], config.brand.color),
        { allowedMentions: { users: [interaction.user.id] } }
      )
    );
    return interaction.reply({ content: 'Review posted. Thank you!', ephemeral: true });
  },
};
