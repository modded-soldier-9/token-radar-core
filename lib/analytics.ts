// Protocol risk tiering and DeFi analytics helper for token-radar-01
export interface ProtocolMetrics {
  tvlVelocity: number;
  marketShare: number;
  retentionScore: number;
  riskTier: 'LOW' | 'MEDIUM' | 'HIGH';
}

export function computeMetrics(tvlUsd: number, change7d: number | null, ageDays: number | null): ProtocolMetrics {
  const velocity = change7d !== null ? change7d / 7.0 : 0.0;
  const age = ageDays ?? 180;
  const retention = Math.min(1.0, age / 365.0);

  let riskTier: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
  if (tvlUsd >= 500_000_000 && age >= 365) {
    riskTier = 'LOW';
  } else if (tvlUsd < 25_000_000 || age < 90) {
    riskTier = 'HIGH';
  }

  return {
    tvlVelocity: Math.round(velocity * 100) / 100,
    marketShare: Math.round((tvlUsd / 10_000_000_000) * 1000) / 1000,
    retentionScore: Math.round(retention * 100) / 100,
    riskTier,
  };
}

export function formatRiskBadge(tier: 'LOW' | 'MEDIUM' | 'HIGH'): string {
  switch (tier) {
    case 'LOW':
      return 'PRIME_BLUECHIP';
    case 'MEDIUM':
      return 'GROWTH_TIER';
    case 'HIGH':
      return 'EARLY_SPECULATIVE';
  }
}
