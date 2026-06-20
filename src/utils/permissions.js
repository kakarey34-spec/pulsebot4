const { PermissionFlagsBits } = require('discord.js');
const store = require('../config/store');

const LEVELS = {
  everyone: 0,
  mod: 1,
  seller: 2,
  owner: 3,
};

function hasRole(member, roleId) {
  return Boolean(roleId && member?.roles?.cache?.has(roleId));
}

function level(member) {
  if (!member) return LEVELS.everyone;
  const config = store.getGuild(member.guild.id);
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return LEVELS.owner;
  if (hasRole(member, config.roles.owner)) return LEVELS.owner;
  if (hasRole(member, config.roles.seller)) return LEVELS.seller;
  if (hasRole(member, config.roles.mod)) return LEVELS.mod;
  return LEVELS.everyone;
}

function canUse(member, required = LEVELS.everyone) {
  return level(member) >= required;
}

async function deny(interaction, label) {
  const payload = { content: `You need **${label}** permission to use this.`, ephemeral: true };
  if (interaction.replied || interaction.deferred) return interaction.editReply(payload);
  return interaction.reply(payload);
}

module.exports = { LEVELS, level, canUse, deny };
