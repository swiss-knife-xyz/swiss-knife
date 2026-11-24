export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return "$0";
  if (value === 0) return "$0";
  if (value < 0.01) return "<$0.01";
  if (value < 1000)
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  if (value < 1_000_000)
    return `$${value.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })}`;
  return `$${(value / 1_000_000).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })}M`;
}

export function formatUsdCompact(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "$0";
  if (value < 0.01) return "<$0.01";
  if (value < 1) return `$${value.toFixed(2)}`;
  if (value < 1_000) return `$${value.toFixed(0)}`;
  if (value < 1_000_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${(value / 1_000_000).toFixed(2)}M`;
}
