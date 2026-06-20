const { SlashCommandBuilder } = require('discord.js');
const store = require('../config/store');
const { LEVELS } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('payment')
    .setDescription('Configure payment instructions')
    .addSubcommand((sub) =>
      sub
        .setName('paypal')
        .setDescription('Set PayPal email and instructions')
        .addStringOption((opt) => opt.setName('email').setDescription('PayPal email').setRequired(true))
        .addStringOption((opt) => opt.setName('instructions').setDescription('Instructions. Use {email} and {amount}.').setMaxLength(1000))
    )
    .addSubcommand((sub) =>
      sub
        .setName('paysafe')
        .setDescription('Set PaySafe instructions')
        .addStringOption((opt) => opt.setName('instructions').setDescription('Instructions text').setRequired(true).setMaxLength(1000))
    ),
  permissionLevel: LEVELS.owner,
  permissionLabel: 'owner',
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'paypal') {
      store.setGuild(interaction.guild.id, {
        payments: {
          paypal: {
            email: interaction.options.getString('email'),
            instructions: interaction.options.getString('instructions') || store.getGuild(interaction.guild.id).payments.paypal.instructions,
          },
        },
      });
      return interaction.reply({ content: 'PayPal payment settings updated.', ephemeral: true });
    }
    store.setGuild(interaction.guild.id, {
      payments: { paysafe: { instructions: interaction.options.getString('instructions') } },
    });
    return interaction.reply({ content: 'PaySafe payment settings updated.', ephemeral: true });
  },
};
