import data from "./financial-data.json";

export type FinancialSource = {
  label: string;
  url: string;
  kind: "Primary" | "Reporting" | "Data provider";
};
export type FundingRound = {
  date: string;
  amountUsd?: number;
  amountApproximate?: boolean;
  round: string;
  source: FinancialSource;
};
export type RevenuePeak = { amountUsd: number; period: string };
export type ProjectFinancials = {
  funding?: {
    scopeNote: string;
    rounds: FundingRound[];
  };
  revenue?: {
    scopeNote: string;
    source: FinancialSource;
    methodologyUrl?: string;
    coverageStart: string;
    coverageEnd: string;
    peakMonth?: RevenuePeak;
    peakYear?: RevenuePeak;
  };
};
export const financialReviewedAt = data.reviewedAt;
export const financials = data.records as Record<string, ProjectFinancials>;

export function disclosedFunding(record?: ProjectFinancials) {
  const amounts = record?.funding?.rounds.flatMap((r) =>
    r.amountUsd === undefined ? [] : [r.amountUsd]
  );
  return amounts?.length
    ? amounts.reduce((sum, amount) => sum + amount, 0)
    : undefined;
}

export function fundingIsApproximate(record?: ProjectFinancials) {
  return (
    record?.funding?.rounds.some(
      (round) => round.amountUsd !== undefined && round.amountApproximate
    ) ?? false
  );
}

export type FinancialSort = "name" | "funding" | "raise" | "month" | "year";
export function financialSortValue(id: string, key: FinancialSort) {
  const record = financials[id];
  switch (key) {
    case "funding":
      return disclosedFunding(record);
    case "raise":
      return record?.funding?.rounds[0]?.date;
    case "month":
      return record?.revenue?.peakMonth?.amountUsd;
    case "year":
      return record?.revenue?.peakYear?.amountUsd;
    default:
      return undefined;
  }
}

/** Missing days are unknown, not zero. Only fully covered UTC calendar periods qualify. */
export function observedRevenuePeaks(
  daily: [number, number | null][],
  through: string
) {
  const days = new Map<string, number>();
  const seen = new Set<string>();
  for (const [timestamp, value] of daily) {
    if (!Number.isInteger(timestamp) || timestamp % 86400 !== 0)
      throw new Error("Revenue timestamps must be UTC day boundaries");
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
    if (seen.has(date)) throw new Error(`Duplicate revenue day: ${date}`);
    seen.add(date);
    if (date >= through || value === null) continue;
    if (!Number.isFinite(value)) throw new Error(`Invalid revenue: ${date}`);
    days.set(date, value);
  }
  const dates = [...days.keys()].sort();
  if (!dates.length) return undefined;
  function peak(length: 4 | 7): RevenuePeak | undefined {
    const periods = [...new Set(dates.map((day) => day.slice(0, length)))];
    let best: RevenuePeak | undefined;
    for (const period of periods) {
      const start = new Date(
        `${period}${length === 4 ? "-01" : ""}-01T00:00:00Z`
      );
      const end = new Date(start);
      if (length === 4) end.setUTCFullYear(end.getUTCFullYear() + 1);
      else end.setUTCMonth(end.getUTCMonth() + 1);
      if (end.toISOString().slice(0, 10) > through) continue;
      let sum = 0,
        complete = true;
      for (
        const day = new Date(start);
        day < end;
        day.setUTCDate(day.getUTCDate() + 1)
      ) {
        const value = days.get(day.toISOString().slice(0, 10));
        if (value === undefined) {
          complete = false;
          break;
        }
        sum += value;
      }
      if (complete && (!best || sum > best.amountUsd))
        best = { period, amountUsd: Math.round(sum * 100) / 100 };
    }
    return best;
  }
  return {
    coverageStart: dates[0],
    coverageEnd: dates.at(-1)!,
    peakMonth: peak(7),
    peakYear: peak(4),
  };
}
