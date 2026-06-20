const IS_COMPONENTS_V2 = 1 << 15;
const EPHEMERAL = 1 << 6;

function text(content) {
  return { type: 10, content: String(content).slice(0, 4000) };
}

function separator(spacing = 1) {
  return { type: 14, spacing };
}

function button(custom_id, label, style = 2, emoji, disabled = false) {
  const payload = { type: 2, custom_id, label: String(label).slice(0, 80), style, disabled };
  if (emoji) payload.emoji = { name: emoji };
  return payload;
}

function linkButton(url, label, emoji) {
  const payload = { type: 2, style: 5, url, label: String(label).slice(0, 80) };
  if (emoji) payload.emoji = { name: emoji };
  return payload;
}

function row(...components) {
  return { type: 1, components: components.flat().slice(0, 5) };
}

function media(url, description = 'Pulse Studio image') {
  if (!url) return null;
  return { type: 12, items: [{ media: { url }, description }] };
}

function container(components, accentColor = 0x00aeef) {
  return {
    type: 17,
    accent_color: accentColor,
    components: components.flat().filter(Boolean).slice(0, 40),
  };
}

function message(components, options = {}) {
  const flags = IS_COMPONENTS_V2 | (options.ephemeral ? EPHEMERAL : 0);
  return {
    flags,
    components: Array.isArray(components) ? components : [components],
    allowedMentions: options.allowedMentions || { parse: [] },
  };
}

module.exports = {
  IS_COMPONENTS_V2,
  EPHEMERAL,
  text,
  separator,
  button,
  linkButton,
  row,
  media,
  container,
  message,
};
