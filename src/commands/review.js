const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const store = require('../config/store');

function reviewFooterDate() {
  return new Date().toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('review')
    .setDescription('Leave a Pulse Studios review')
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

    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setAuthor({
        name: `${interaction.user.username} left a service rating`,
        iconURL: avatarUrl,
      })
      .setTitle('Service Review')
      .setDescription(body)
      .addFields(
        { name: 'Reviewer', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Stars', value: `${'⭐'.repeat(stars)} ▫ (${stars}/5)`, inline: true }
      )
      .setThumbnail(avatarUrl)
      .setFooter({
        text: `Review submitted by ${interaction.user.username} • ${reviewFooterDate()}`,
      });

    await interaction.channel.send({
      embeds: [embed],
      allowedMentions: { users: [interaction.user.id] },
    });
    return interaction.reply({ content: 'Review posted. Thank you!', ephemeral: true });
  },
};
