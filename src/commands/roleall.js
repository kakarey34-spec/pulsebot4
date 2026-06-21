const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { LEVELS } = require('../utils/permissions');

const BATCH_DELAY_MS = 350;
const PROGRESS_EVERY = 10;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roleall')
    .setDescription('Give a role to all server members')
    .addRoleOption((opt) => opt.setName('role').setDescription('Role to assign').setRequired(true)),
  permissionLevel: LEVELS.mod,
  permissionLabel: 'mod',
  async execute(interaction) {
    const role = interaction.options.getRole('role');
    const me = interaction.guild.members.me;

    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({ content: 'I need the **Manage Roles** permission.', ephemeral: true });
    }
    if (role.managed) {
      return interaction.reply({ content: 'That role is managed by an integration and cannot be assigned manually.', ephemeral: true });
    }
    if (role.position >= me.roles.highest.position) {
      return interaction.reply({ content: 'That role is above my highest role. Move my role higher first.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    await interaction.guild.members.fetch();
    const targets = interaction.guild.members.cache.filter(
      (member) => !member.user.bot && !member.roles.cache.has(role.id)
    );

    if (!targets.size) {
      return interaction.editReply({ content: `Everyone already has **${role.name}**.` });
    }

    let assigned = 0;
    let failed = 0;

    for (const member of targets.values()) {
      try {
        await member.roles.add(role, `Roleall by ${interaction.user.tag}`);
        assigned += 1;
      } catch {
        failed += 1;
      }

      if (assigned % PROGRESS_EVERY === 0) {
        await interaction.editReply({
          content: `Assigning **${role.name}**… ${assigned}/${targets.size} done (${failed} failed).`,
        }).catch(() => null);
      }

      await sleep(BATCH_DELAY_MS);
    }

    return interaction.editReply({
      content: [
        `Finished assigning **${role.name}**.`,
        `Added: **${assigned}**`,
        failed ? `Failed: **${failed}**` : null,
      ].filter(Boolean).join('\n'),
    });
  },
};
