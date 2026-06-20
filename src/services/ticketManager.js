const {
  AttachmentBuilder,
  ChannelType,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const store = require('../config/store');
const v2 = require('../utils/v2');
const { sendLog, sendTicketTranscript } = require('../utils/logs');

const TYPES = {
  purchase: { label: 'Purchase Ticket', emoji: '🛒' },
  support: { label: 'Support Ticket', emoji: '🛠️' },
  partner: { label: 'Partner Ticket', emoji: '🤝' },
};

const TICKET_OPEN_PREFIX = 'ticket_open:';
const TICKET_CLOSE = 'ticket_close';
const PAYMENT_PREFIX = 'payment:';
const PROMO_MODAL_PREFIX = 'promo_modal:';
const PROMO_BUTTON_PREFIX = 'promo_button:';

const locks = new Set();
const LOGO_PATH = path.join(__dirname, '../../assets/pulse-studios-logo.png');
const LOGO_NAME = 'pulse-studios-logo.png';

function ticketPanelPayload(guildId, logoUrl = null) {
  const config = store.getGuild(guildId);
  const counts = store.ticketCounts(guildId);
  const resolvedLogo = logoUrl || config.brand.logoUrl;
  return v2.message(
    v2.container([
      resolvedLogo ? v2.media(resolvedLogo, 'Pulse Studio logo') : null,
      v2.text('## PULSE STUDIO Ticket Panel'),
      v2.text(
        [
          'Open the ticket type that matches what you need.',
          '',
          `**Live Active Counters**`,
          `Purchase: **${counts.purchase}**`,
          `Support: **${counts.support}**`,
          `Partner: **${counts.partner}**`,
          `Total Active: **${counts.total}**`,
        ].join('\n')
      ),
      v2.separator(),
      v2.row(
        v2.button(`${TICKET_OPEN_PREFIX}purchase`, 'Purchase Tickets', 1, '🛒'),
        v2.button(`${TICKET_OPEN_PREFIX}support`, 'Support Tickets', 2, '🛠️'),
        v2.button(`${TICKET_OPEN_PREFIX}partner`, 'Partner Tickets', 2, '🤝')
      ),
      v2.text(`-# ${config.brand.footer}`),
    ], config.brand.color)
  );
}

async function refreshPanel(guild) {
  const config = store.getGuild(guild.id);
  if (!config.tickets.panelChannelId || !config.tickets.panelMessageId) return;
  const channel = await guild.channels.fetch(config.tickets.panelChannelId).catch(() => null);
  if (!channel?.isTextBased()) return;
  const message = await channel.messages.fetch(config.tickets.panelMessageId).catch(() => null);
  if (!message) return;
  await message.edit(ticketPanelPayload(guild.id)).catch(() => null);
}

async function postPanel(channel) {
  const hasLogo = fs.existsSync(LOGO_PATH);
  const logoUrl = hasLogo ? `attachment://${LOGO_NAME}` : null;
  const sent = await channel.send({
    ...ticketPanelPayload(channel.guild.id, logoUrl),
    files: hasLogo ? [{ attachment: LOGO_PATH, name: LOGO_NAME }] : [],
  });
  const uploadedLogoUrl = sent.attachments.first()?.url || store.getGuild(channel.guild.id).brand.logoUrl || null;
  store.setGuild(channel.guild.id, {
    brand: { logoUrl: uploadedLogoUrl },
    tickets: { panelChannelId: channel.id, panelMessageId: sent.id },
  });
  if (uploadedLogoUrl) {
    await sent.edit(ticketPanelPayload(channel.guild.id, uploadedLogoUrl)).catch(() => null);
  }
  return sent;
}

function openModal(type) {
  const label = TYPES[type]?.label || 'Ticket';
  const modal = new ModalBuilder().setCustomId(`${TICKET_OPEN_PREFIX}${type}`).setTitle(label);

  if (type === 'purchase') {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('product_id')
          .setLabel('Product ID')
          .setPlaceholder('Example: PULSE-001')
          .setStyle(TextInputStyle.Short)
          .setMinLength(2)
          .setMaxLength(40)
          .setRequired(true)
      )
    );
  }

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('details')
        .setLabel(type === 'purchase' ? 'Extra notes' : 'How can we help?')
        .setPlaceholder('Write the important details here.')
        .setStyle(TextInputStyle.Paragraph)
        .setMinLength(3)
        .setMaxLength(1000)
        .setRequired(type !== 'purchase')
    )
  );
  return modal;
}

function slug(value) {
  return String(value || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'user';
}

function paymentRows(channelId) {
  return [
    v2.row(
      v2.button(`${PAYMENT_PREFIX}paypal:${channelId}`, 'PayPal', 1, '💳'),
      v2.button(`${PAYMENT_PREFIX}paysafe:${channelId}`, 'PaySafe', 1, '🎫'),
      v2.button(`${PROMO_BUTTON_PREFIX}${channelId}`, 'Apply Promo', 2, '🏷️'),
      v2.button(TICKET_CLOSE, 'Close', 4, '🔒')
    ),
  ];
}

function closeRow() {
  return v2.row(v2.button(TICKET_CLOSE, 'Close Ticket', 4, '🔒'));
}

function ticketIntroPayload(guildId, ticket, product = null) {
  const config = store.getGuild(guildId);
  const type = TYPES[ticket.type];
  const lines = [
    `## ${type.emoji} ${type.label}`,
    `User: <@${ticket.userId}>`,
    `Ticket ID: **${ticket.ticketId}**`,
  ];

  if (product) {
    lines.push('', `**Product**: ${product.name}`, `**Product ID**: \`${product.id}\``, `**Price**: €${Number(product.price || 0).toFixed(2)}`);
    if (product.description) lines.push('', product.description);
  }

  if (ticket.details) lines.push('', `**Details**\n${ticket.details}`);

  return v2.message(
    v2.container([
      v2.text(lines.join('\n')),
      v2.separator(),
      v2.text(
        ticket.type === 'purchase'
          ? 'Choose a payment method below. If you have a discount promocode, apply it before sending payment.'
          : 'Staff will be with you shortly. Keep all details in this channel so the transcript is complete.'
      ),
      ticket.type === 'purchase' ? paymentRows(ticket.channelId) : closeRow(),
      v2.text(`-# ${config.brand.footer}`),
    ], config.brand.color),
    { allowedMentions: { users: [ticket.userId], roles: [] } }
  );
}

function modalTextValue(fields, customId) {
  if (!fields.fields.has(customId)) return '';
  return fields.getTextInputValue(customId).trim();
}

function collectOverwrites(guild, userId, config) {
  const staffRoles = [config.roles.owner, config.roles.mod, config.roles.seller].filter(Boolean);
  const botId = guild.client.user.id;
  const overwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: userId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    {
      id: botId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];
  for (const roleId of staffRoles) {
    if (!guild.roles.cache.has(roleId)) continue;
    overwrites.push({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }
  return overwrites;
}

async function resolveTicketParent(guild, categoryId) {
  if (!categoryId) return undefined;
  const parent = await guild.channels.fetch(categoryId).catch(() => null);
  return parent?.type === ChannelType.GuildCategory ? parent.id : undefined;
}

function ticketCreateError(error) {
  const code = error?.code ?? error?.rawError?.code;
  if (code === 50013) return 'I do not have permission to create ticket channels. Check bot permissions and role position.';
  if (code === 50035) return 'Ticket setup is invalid. Run `/ticket category` again with a valid category.';
  if (code === 30013) return 'This server has reached the maximum number of channels.';
  return 'Could not open your ticket. Ask staff to check bot permissions and `/ticket category`.';
}

async function createTicketFromModal(interaction) {
  const type = interaction.customId.slice(TICKET_OPEN_PREFIX.length);
  if (!TYPES[type]) return { error: 'Unknown ticket type.' };

  const lockKey = `${interaction.guild.id}:${interaction.user.id}`;
  if (locks.has(lockKey)) return { error: 'Your ticket is already opening. Wait a second.' };
  locks.add(lockKey);

  try {
    const existing = store.findOpenTicket(interaction.guild.id, interaction.user.id);
    if (existing) return { error: `You already have an open ticket: <#${existing.channelId}>` };

    const config = store.getGuild(interaction.guild.id);
    const productId = type === 'purchase'
      ? modalTextValue(interaction.fields, 'product_id').toUpperCase()
      : null;
    const product = productId ? store.getProduct(interaction.guild.id, productId) : null;
    if (type === 'purchase' && !product) {
      return { error: `I could not find a product with ID \`${productId}\`. Check the shop listing and try again.` };
    }

    const details = modalTextValue(interaction.fields, 'details');
    const number = store.nextTicketNumber(interaction.guild.id, type);
    const ticketId = `${type.toUpperCase()}-${String(number).padStart(4, '0')}`;
    const parent = await resolveTicketParent(interaction.guild, config.tickets.categoryId);
    let channel;
    try {
      channel = await interaction.guild.channels.create({
        name: `${type}-${slug(interaction.user.username)}-${number}`,
        type: ChannelType.GuildText,
        parent,
        topic: `Pulse Studio ${type} ticket ${ticketId} | ${interaction.user.tag} (${interaction.user.id})`,
        permissionOverwrites: collectOverwrites(interaction.guild, interaction.user.id, config),
      });
    } catch (error) {
      console.error('Ticket channel create failed:', error);
      return { error: ticketCreateError(error) };
    }

    const ticket = {
      guildId: interaction.guild.id,
      channelId: channel.id,
      userId: interaction.user.id,
      type,
      ticketId,
      productId,
      details,
      status: 'open',
      discountPercent: 0,
      promoCode: null,
      createdAt: Date.now(),
    };
    store.setTicket(channel.id, ticket);

    try {
      await channel.send(ticketIntroPayload(interaction.guild.id, ticket, product));
    } catch (error) {
      console.error('Ticket intro send failed:', error);
      store.deleteTicket(channel.id);
      await channel.delete('Pulse Studio ticket intro failed').catch(() => null);
      return { error: 'The ticket channel was created but the welcome message failed. Try again or ask staff for help.' };
    }
    await refreshPanel(interaction.guild);
    await sendLog(interaction.guild, 'ticketLogs', 'Ticket Opened', [
      `Type: **${TYPES[type].label}**`,
      `Ticket: <#${channel.id}>`,
      `User: <@${interaction.user.id}>`,
      product ? `Product: **${product.name}** (\`${product.id}\`)` : null,
    ]);
    return { channel };
  } finally {
    locks.delete(lockKey);
  }
}

function finalPrice(ticket, product) {
  const base = Number(product?.price || 0);
  const discount = Math.max(0, Math.min(100, Number(ticket.discountPercent || 0)));
  return Math.max(0, base * (1 - discount / 100));
}

function closestPaysafeTier(amount, tiers) {
  for (const tier of tiers) {
    if (tier >= amount) return tier;
  }
  return tiers[tiers.length - 1];
}

async function sendPayment(interaction, method, channelId) {
  if (interaction.channelId !== channelId) {
    return interaction.reply({ content: 'Use this payment button inside the matching ticket.', ephemeral: true });
  }
  const ticket = store.getTicket(channelId);
  if (!ticket || ticket.userId !== interaction.user.id) {
    return interaction.reply({ content: 'Only the ticket owner can choose payment.', ephemeral: true });
  }
  const product = store.getProduct(interaction.guild.id, ticket.productId);
  if (!product) return interaction.reply({ content: 'The product for this ticket no longer exists.', ephemeral: true });

  const config = store.getGuild(interaction.guild.id);
  const amount = finalPrice(ticket, product);
  const lines = [`## Payment Instructions`, `Product: **${product.name}**`, `Amount due: **€${amount.toFixed(2)}**`];

  if (ticket.promoCode) lines.push(`Promo: **${ticket.promoCode}** (${ticket.discountPercent}% off)`);
  if (method === 'paypal') {
    lines.push('', config.payments.paypal.instructions.replaceAll('{email}', config.payments.paypal.email).replaceAll('{amount}', amount.toFixed(2)));
  } else {
    const tier = closestPaysafeTier(amount, config.payments.paysafe.tiers);
    lines.push('', `Closest PaySafe card tier: **€${tier}**`, config.payments.paysafe.instructions);
  }
  lines.push('', 'After paying, upload proof in this ticket. Staff will verify it.');

  ticket.paymentMethod = method;
  ticket.amountDue = amount;
  ticket.updatedAt = Date.now();
  store.setTicket(channelId, ticket);

  return interaction.reply(v2.message(v2.container([v2.text(lines.join('\n')), v2.separator(), closeRow()], config.brand.accentColor), { ephemeral: false }));
}

function promoModal(channelId) {
  const modal = new ModalBuilder().setCustomId(`${PROMO_MODAL_PREFIX}${channelId}`).setTitle('Apply discount promo');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('code')
        .setLabel('Promocode')
        .setPlaceholder('Example: PULSE20')
        .setStyle(TextInputStyle.Short)
        .setMinLength(2)
        .setMaxLength(32)
        .setRequired(true)
    )
  );
  return modal;
}

async function applyPromo(interaction) {
  const channelId = interaction.customId.slice(PROMO_MODAL_PREFIX.length);
  const ticket = store.getTicket(channelId);
  if (!ticket || ticket.userId !== interaction.user.id) {
    return interaction.reply({ content: 'Only the ticket owner can apply a promo.', ephemeral: true });
  }
  const code = interaction.fields.getTextInputValue('code').trim().toUpperCase();
  const promo = store.getPromo(interaction.guild.id, code);
  if (!promo || promo.enabled === false) {
    return interaction.reply({ content: 'That promocode is not active.', ephemeral: true });
  }
  if (promo.expiresAt && promo.expiresAt < Date.now()) {
    return interaction.reply({ content: 'That promocode has expired.', ephemeral: true });
  }
  if (promo.maxUses && (promo.uses || 0) >= promo.maxUses) {
    return interaction.reply({ content: 'That promocode has reached its use limit.', ephemeral: true });
  }

  promo.uses = (promo.uses || 0) + 1;
  store.upsertPromo(interaction.guild.id, promo);
  ticket.promoCode = promo.code;
  ticket.discountPercent = promo.discountPercent;
  ticket.updatedAt = Date.now();
  store.setTicket(channelId, ticket);

  return interaction.reply({
    content: `Promo **${promo.code}** applied for **${promo.discountPercent}% off**. Choose a payment method again to see the updated total.`,
    ephemeral: true,
  });
}

async function closeTicket(channel, closedBy) {
  const ticket = store.getTicket(channel.id);
  if (!ticket) return { error: 'This is not an active ticket channel.' };
  ticket.status = 'closed';
  ticket.closedAt = Date.now();
  ticket.closedBy = closedBy.id;
  store.setTicket(channel.id, ticket);

  const transcript = await buildTranscript(channel);
  const config = store.getGuild(channel.guild.id);
  const type = TYPES[ticket.type];

  const closeTxt = [
    `Ticket ID: ${ticket.ticketId}`,
    `Type: ${type.label}`,
    `User ID: ${ticket.userId}`,
    `Closed by: ${closedBy.tag} (${closedBy.id})`,
    `Channel: ${channel.name} (${channel.id})`,
    `Messages: ${transcript.count}`,
    `Closed: ${new Date().toISOString()}`,
    '',
    '=== CONVERSATION ===',
    '',
    transcript.body,
  ].join('\n');

  const txtFilename = `${channel.name}-${channel.id}-transcript.txt`;
  await sendTicketTranscript(
    channel.guild,
    [
      `**Ticket:** ${ticket.ticketId}`,
      `**Type:** ${type.emoji} ${type.label}`,
      `**User:** <@${ticket.userId}>`,
      `**Closed by:** <@${closedBy.id}>`,
      `**Messages:** ${transcript.count}`,
      `**Channel:** #${channel.name}`,
    ],
    closeTxt,
    txtFilename
  );

  await refreshPanel(channel.guild);
  await channel.send(v2.message(v2.container([v2.text('## Ticket Closed\nTranscript saved. This channel will be removed shortly.')], config.brand.color)));
  setTimeout(async () => {
    await channel.delete('Pulse Studio ticket closed').catch(() => null);
    store.deleteTicket(channel.id);
  }, 5000);
  return { ok: true };
}

async function buildTranscript(channel) {
  const messages = [];
  let before;
  while (messages.length < 1000) {
    const batch = await channel.messages.fetch({ limit: 100, before }).catch(() => null);
    if (!batch?.size) break;
    messages.push(...batch.values());
    before = batch.last().id;
    if (batch.size < 100) break;
  }
  const ordered = messages.reverse();
  const body = ordered.map((msg) => {
    const author = `${msg.author?.tag || 'Unknown'} (${msg.author?.id || 'unknown'})`;
    const content = msg.content?.trim() || '[no text]';
    const attachments = msg.attachments.size ? `\nAttachments: ${msg.attachments.map((a) => a.url).join(', ')}` : '';
    return `[${msg.createdAt?.toISOString()}] ${author}\n${content}${attachments}`;
  }).join('\n\n---\n\n');
  const attachment = new AttachmentBuilder(Buffer.from(body || '[no messages]', 'utf8'), {
    name: `${channel.name}-${channel.id}-transcript.txt`,
  });
  return { attachment, body: body || '[no messages]', count: ordered.length };
}

module.exports = {
  TYPES,
  TICKET_OPEN_PREFIX,
  TICKET_CLOSE,
  PAYMENT_PREFIX,
  PROMO_MODAL_PREFIX,
  PROMO_BUTTON_PREFIX,
  postPanel,
  refreshPanel,
  openModal,
  createTicketFromModal,
  sendPayment,
  promoModal,
  applyPromo,
  closeTicket,
};
