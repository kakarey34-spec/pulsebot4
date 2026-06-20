const fs = require('fs');
const path = require('path');
const defaults = require('./defaults');

const DATA_DIR = path.join(__dirname, '../../data');
const FILES = {
  config: path.join(DATA_DIR, 'guild-config.json'),
  tickets: path.join(DATA_DIR, 'active-tickets.json'),
  products: path.join(DATA_DIR, 'products.json'),
  promos: path.join(DATA_DIR, 'promocodes.json'),
  giveaways: path.join(DATA_DIR, 'giveaways.json'),
  counters: path.join(DATA_DIR, 'ticket-counters.json'),
  security: path.join(DATA_DIR, 'security-actions.json'),
};

function clone(value) {
  return structuredClone(value);
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(filePath, fallback) {
  ensureDataDir();
  if (!fs.existsSync(filePath)) return clone(fallback);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return clone(fallback);
  }
}

function writeJson(filePath, data) {
  ensureDataDir();
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

function deepMerge(target, source) {
  const out = { ...target };
  for (const [key, value] of Object.entries(source || {})) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      out[key] = deepMerge(target[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

class JsonStore {
  async init() {
    this.config = readJson(FILES.config, {});
    this.tickets = readJson(FILES.tickets, {});
    this.products = readJson(FILES.products, {});
    this.promos = readJson(FILES.promos, {});
    this.giveaways = readJson(FILES.giveaways, {});
    this.counters = readJson(FILES.counters, {});
    this.security = readJson(FILES.security, {});
    console.log('Storage: JSON files in data/ (Render persistent disk recommended)');
  }

  getGuild(guildId) {
    if (!this.config[guildId]) {
      this.config[guildId] = clone(defaults);
      this.saveConfig();
    }
    return deepMerge(clone(defaults), this.config[guildId]);
  }

  setGuild(guildId, partial) {
    this.config[guildId] = deepMerge(this.getGuild(guildId), partial);
    this.saveConfig();
    return this.getGuild(guildId);
  }

  saveConfig() {
    writeJson(FILES.config, this.config);
  }

  getTicket(channelId) {
    return this.tickets[channelId] || null;
  }

  setTicket(channelId, ticket) {
    this.tickets[channelId] = ticket;
    writeJson(FILES.tickets, this.tickets);
  }

  deleteTicket(channelId) {
    delete this.tickets[channelId];
    writeJson(FILES.tickets, this.tickets);
  }

  listTickets(guildId) {
    return Object.entries(this.tickets)
      .filter(([, ticket]) => ticket.guildId === guildId)
      .map(([channelId, ticket]) => ({ channelId, ...ticket }));
  }

  findOpenTicket(guildId, userId) {
    return this.listTickets(guildId).find(
      (ticket) => ticket.userId === userId && ticket.status !== 'closed'
    );
  }

  nextTicketNumber(guildId, type) {
    if (!this.counters[guildId]) this.counters[guildId] = {};
    this.counters[guildId][type] = (this.counters[guildId][type] || 0) + 1;
    writeJson(FILES.counters, this.counters);
    return this.counters[guildId][type];
  }

  ticketCounts(guildId) {
    const counts = { purchase: 0, support: 0, partner: 0, total: 0 };
    for (const ticket of this.listTickets(guildId)) {
      if (ticket.status === 'closed') continue;
      counts[ticket.type] = (counts[ticket.type] || 0) + 1;
      counts.total += 1;
    }
    return counts;
  }

  upsertProduct(guildId, product) {
    if (!this.products[guildId]) this.products[guildId] = {};
    this.products[guildId][product.id] = product;
    writeJson(FILES.products, this.products);
  }

  getProduct(guildId, productId) {
    return this.products[guildId]?.[String(productId).toUpperCase()] || null;
  }

  deleteProduct(guildId, productId) {
    if (this.products[guildId]) {
      delete this.products[guildId][String(productId).toUpperCase()];
      writeJson(FILES.products, this.products);
    }
  }

  listProducts(guildId) {
    return Object.values(this.products[guildId] || {});
  }

  upsertPromo(guildId, promo) {
    if (!this.promos[guildId]) this.promos[guildId] = {};
    this.promos[guildId][promo.code] = promo;
    writeJson(FILES.promos, this.promos);
  }

  getPromo(guildId, code) {
    return this.promos[guildId]?.[String(code).toUpperCase()] || null;
  }

  deletePromo(guildId, code) {
    if (this.promos[guildId]) {
      delete this.promos[guildId][String(code).toUpperCase()];
      writeJson(FILES.promos, this.promos);
    }
  }

  listPromos(guildId) {
    return Object.values(this.promos[guildId] || {});
  }

  setGiveaway(messageId, giveaway) {
    this.giveaways[messageId] = giveaway;
    writeJson(FILES.giveaways, this.giveaways);
  }

  getGiveaway(messageId) {
    return this.giveaways[messageId] || null;
  }

  deleteGiveaway(messageId) {
    delete this.giveaways[messageId];
    writeJson(FILES.giveaways, this.giveaways);
  }

  listActiveGiveaways() {
    const now = Date.now();
    return Object.values(this.giveaways).filter((g) => g.status === 'active' && g.endsAt > now);
  }

  pushSecurityAction(guildId, key, actorId) {
    const bucketKey = `${guildId}:${key}:${actorId}`;
    const now = Date.now();
    const actions = (this.security[bucketKey] || []).filter((at) => now - at < 60_000);
    actions.push(now);
    this.security[bucketKey] = actions;
    writeJson(FILES.security, this.security);
    return actions.length;
  }

  exportSnapshot() {
    return {
      version: 1,
      exportedAt: Date.now(),
      config: clone(this.config),
      tickets: clone(this.tickets),
      products: clone(this.products),
      promos: clone(this.promos),
      giveaways: clone(this.giveaways),
      counters: clone(this.counters),
      security: clone(this.security),
    };
  }

  importSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return false;
    if (snapshot.config) {
      this.config = clone(snapshot.config);
      writeJson(FILES.config, this.config);
    }
    if (snapshot.tickets) {
      this.tickets = clone(snapshot.tickets);
      writeJson(FILES.tickets, this.tickets);
    }
    if (snapshot.products) {
      this.products = clone(snapshot.products);
      writeJson(FILES.products, this.products);
    }
    if (snapshot.promos) {
      this.promos = clone(snapshot.promos);
      writeJson(FILES.promos, this.promos);
    }
    if (snapshot.giveaways) {
      this.giveaways = clone(snapshot.giveaways);
      writeJson(FILES.giveaways, this.giveaways);
    }
    if (snapshot.counters) {
      this.counters = clone(snapshot.counters);
      writeJson(FILES.counters, this.counters);
    }
    if (snapshot.security) {
      this.security = clone(snapshot.security);
      writeJson(FILES.security, this.security);
    }
    return true;
  }
}

module.exports = new JsonStore();
