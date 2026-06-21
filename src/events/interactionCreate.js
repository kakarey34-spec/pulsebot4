const ticketManager = require('../services/ticketManager');
const giveawayService = require('../services/giveawayService');
const reviewService = require('../services/reviewService');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    try {
      if (interaction.isChatInputCommand()) {
        return client.slashHandler.handleSlashCommand(interaction);
      }

      if (interaction.isButton()) {
        if (interaction.customId.startsWith(ticketManager.TICKET_OPEN_PREFIX)) {
          const type = interaction.customId.slice(ticketManager.TICKET_OPEN_PREFIX.length);
          return interaction.showModal(ticketManager.openModal(type));
        }

        if (interaction.customId.startsWith(ticketManager.PAYMENT_PREFIX)) {
          const [, method, channelId] = interaction.customId.split(':');
          return ticketManager.sendPayment(interaction, method, channelId);
        }

        if (interaction.customId.startsWith(ticketManager.PROMO_BUTTON_PREFIX)) {
          const channelId = interaction.customId.slice(ticketManager.PROMO_BUTTON_PREFIX.length);
          return interaction.showModal(ticketManager.promoModal(channelId));
        }

        if (interaction.customId === ticketManager.TICKET_CLOSE) {
          await interaction.deferReply({ ephemeral: true });
          const result = await ticketManager.closeTicket(interaction.channel, interaction.member);
          return interaction.editReply({ content: result.error || 'Ticket closing.' });
        }

        if (interaction.customId === reviewService.REVIEW_OPEN) {
          return reviewService.handleOpen(interaction);
        }

        if (giveawayService.isEnterButton(interaction.customId)) {
          return giveawayService.handleEnter(interaction);
        }
      }

      if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith(ticketManager.TICKET_OPEN_PREFIX)) {
          await interaction.deferReply({ ephemeral: true });
          const result = await ticketManager.createTicketFromModal(interaction);
          return interaction.editReply({
            content: result.error || `Ticket opened: <#${result.channel.id}>`,
          });
        }

        if (interaction.customId === reviewService.REVIEW_SUBMIT) {
          return reviewService.handleSubmit(interaction);
        }

        if (interaction.customId.startsWith(ticketManager.PROMO_MODAL_PREFIX)) {
          return ticketManager.applyPromo(interaction);
        }
      }
    } catch (error) {
      console.error('Interaction error:', error);
      const payload = { content: 'Something went wrong.', ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(payload).catch(() => null);
      } else {
        await interaction.reply(payload).catch(() => null);
      }
    }
  },
};
