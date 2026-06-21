function minCardsForSumCents(sumCents, denomCents) {
  if (sumCents <= 0) return [];
  const dp = new Array(sumCents + 1).fill(Infinity);
  const choice = new Array(sumCents + 1).fill(0);
  dp[0] = 0;
  for (let i = 1; i <= sumCents; i++) {
    for (const d of denomCents) {
      if (i >= d && dp[i - d] + 1 < dp[i]) {
        dp[i] = dp[i - d] + 1;
        choice[i] = d;
      }
    }
  }
  if (dp[sumCents] === Infinity) return null;
  const cards = [];
  let remaining = sumCents;
  while (remaining > 0) {
    const d = choice[remaining];
    if (!d) return null;
    cards.push(d);
    remaining -= d;
  }
  return cards;
}

function suggestPaysafeCards(amount, tiers) {
  const denoms = [...new Set(tiers)].filter((t) => t > 0).sort((a, b) => a - b);
  if (!denoms.length) return { total: amount, cards: [] };

  const denomCents = denoms.map((d) => Math.round(d * 100));
  const targetCents = Math.ceil(amount * 100);
  const maxDenomCents = denomCents[denomCents.length - 1];
  const searchLimit = targetCents + maxDenomCents;

  for (let sumCents = targetCents; sumCents <= searchLimit; sumCents++) {
    const cardsCents = minCardsForSumCents(sumCents, denomCents);
    if (cardsCents) {
      return {
        total: sumCents / 100,
        cards: cardsCents.map((c) => c / 100),
      };
    }
  }

  const count = Math.ceil(targetCents / maxDenomCents);
  const cards = Array(count).fill(maxDenomCents / 100);
  return { total: (count * maxDenomCents) / 100, cards };
}

function formatPaysafeSuggestion({ total, cards }) {
  const counts = new Map();
  for (const card of cards) counts.set(card, (counts.get(card) || 0) + 1);
  const parts = [...counts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([denom, count]) => `${count} × €${denom}`);
  if (!parts.length) return `**€${total.toFixed(2)}**`;
  return `${parts.join(' + ')} = **€${total.toFixed(2)}**`;
}

module.exports = { suggestPaysafeCards, formatPaysafeSuggestion };
