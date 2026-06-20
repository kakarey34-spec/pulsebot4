module.exports = {
  brand: {
    name: 'Pulse Studio',
    footer: 'Pulse Studio Made By LyxosDime',
    color: 0x00aeef,
    accentColor: 0xc0c0c0,
    logoUrl: null,
  },
  backup: {
    channelId: '1517946266800095232',
  },
  roles: {
    owner: '1517510292526075925',
    mod: '1517887427300036628',
    seller: '1517887595638558830',
  },
  autoRole: {
    roleId: null,
  },
  channels: {
    review: '1517500145149935636',
    suggestions: '1517695780490707014',
    memberLogs: '1517512986409959425',
    channelLogs: '1517513252341289151',
    roleLogs: '1517513287363854447',
    voiceLogs: '1517513324919521290',
    moderationLogs: '1517513378837303406',
    ticketLogs: '1517513514397204520',
    antiLinkLogs: '1517513591006167242',
    commandLogs: '1517513697889747044',
    securityLogs: '1517513767129190523',
    serverLogs: '1517513808900395058',
  },
  tickets: {
    categoryId: null,
    panelChannelId: null,
    panelMessageId: null,
    transcriptChannelId: '1517513514397204520',
    cooldownSeconds: 20,
  },
  payments: {
    paypal: {
      enabled: true,
      email: 'your-paypal@email.com',
      instructions:
        'Send the exact amount to **{email}** using PayPal. Include your Discord username and ticket ID in the note.',
    },
    paysafe: {
      enabled: true,
      tiers: [5, 10, 25, 50, 100],
      instructions:
        'Buy the closest PaySafe card tier for the amount shown, then send the code/proof in this ticket.',
    },
  },
  antiLink: {
    enabled: true,
    ignoredRoleIds: ['1517510292526075925', '1517887427300036628', '1517887595638558830'],
    authorizedUserIds: [],
    allowedDomains: [],
  },
  antiNuke: {
    enabled: true,
    maxActionsPerMinute: 6,
    ignoredUserIds: [],
  },
};
