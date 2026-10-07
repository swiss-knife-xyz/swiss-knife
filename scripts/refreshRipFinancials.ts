import { readFile, writeFile } from "node:fs/promises";
import { shutdownProjects } from "../app/rip/data";
import {
  observedRevenuePeaks,
  type FundingRound,
  type ProjectFinancials,
} from "../app/rip/financials";

type Mapping = {
  slug: string;
  expectedId: string;
  entity: string;
  scopeNote: string;
  excludedRoundKeys?: string[];
};
type Config = Record<
  string,
  {
    funding?: Mapping;
    revenue?: Mapping;
    manualFunding?: {
      entity: string;
      scopeNote: string;
      rounds: FundingRound[];
    };
  }
>;
type ProviderRound = {
  date: number;
  amount: number | null;
  round: string | null;
  name: string;
};
type Snapshot = {
  reviewedAt: string;
  records: Record<
    string,
    {
      funding?: { sourceUrl: string; entity: string; rounds: ProviderRound[] };
      revenue?: {
        sourceUrl: string;
        entity: string;
        methodologyUrl?: string;
        daily: [number, number | null][];
      };
    }
  >;
};
async function main() {
  const config: Config = JSON.parse(
    await readFile("docs/rip/financial-sources.json", "utf8")
  );
  const offline = process.argv.includes("--from-snapshot");
  const asOf = process.argv.find((arg) => /^--as-of=/.test(arg))?.slice(8);
  if (!offline && !asOf)
    throw new Error(
      "Pass --as-of=YYYY-MM-DD using the review date, or --from-snapshot"
    );
  const snapshot: Snapshot = offline
    ? JSON.parse(await readFile("docs/rip/financial-snapshot.json", "utf8"))
    : { reviewedAt: asOf!, records: {} };
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(snapshot.reviewedAt) ||
    new Date(snapshot.reviewedAt).toISOString().slice(0, 10) !==
      snapshot.reviewedAt
  )
    throw new Error("Invalid review date");
  const records: Record<string, ProjectFinancials> = {};
  for (const [id, mapping] of Object.entries(config)) {
    const project = shutdownProjects.find((p) => p.id === id);
    if (!project) throw new Error(`Unknown archive ID: ${id}`);
    // Completed closures cap the financial history; ongoing/scheduled wind-downs use the review date.
    const cutoff =
      project.closed && project.closed < snapshot.reviewedAt
        ? project.closed
        : project.status === "Closed" && project.announced
          ? project.announced
          : snapshot.reviewedAt;
    const record: ProjectFinancials = {};
    for (const kind of ["funding", "revenue"] as const) {
      const source = mapping[kind];
      if (!source) continue;
      const url =
        kind === "funding"
          ? `https://api.llama.fi/protocol/${source.slug}`
          : `https://api.llama.fi/summary/fees/${source.slug}?dataType=dailyRevenue`;
      if (!offline) {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(60000),
        });
        if (!response.ok)
          throw new Error(
            `${id} ${kind}: HTTP ${response.status}; snapshot preserved`
          );
        const body = await response.json();
        if (
          String(body.id) !== source.expectedId ||
          body.name !== source.entity
        )
          throw new Error(
            `${id} ${kind}: source identity changed; review mapping`
          );
        snapshot.records[id] ??= {};
        if (kind === "funding") {
          if (!Array.isArray(body.raises))
            throw new Error(`${id}: missing raises response`);
          snapshot.records[id].funding = {
            sourceUrl: url,
            entity: body.name,
            rounds: body.raises.map(
              ({ date, amount, round, name }: ProviderRound) => ({
                date,
                amount,
                round,
                name,
              })
            ),
          };
        } else {
          if (!Array.isArray(body.totalDataChart))
            throw new Error(`${id}: missing revenue response`);
          snapshot.records[id].revenue = {
            sourceUrl: url,
            entity: body.name,
            methodologyUrl: body.methodologyURL ?? undefined,
            daily: body.totalDataChart,
          };
        }
      }
      const captured = snapshot.records[id]?.[kind];
      if (
        !captured ||
        captured.entity !== source.entity ||
        captured.sourceUrl !== url
      )
        throw new Error(`${id} ${kind}: missing or mismatched snapshot`);
      if (kind === "funding") {
        const seen = new Set<string>();
        const rounds = snapshot.records[id]
          .funding!.rounds.flatMap((r): FundingRound[] => {
            if (
              !Number.isFinite(r.date) ||
              (r.amount !== null &&
                (!Number.isFinite(r.amount) || r.amount < 0))
            )
              throw new Error(`${id}: invalid round`);
            const date = new Date(r.date * 1000).toISOString().slice(0, 10);
            const key = `${date}:${r.round}:${r.amount}`;
            if (
              date > cutoff ||
              seen.has(key) ||
              source.excludedRoundKeys?.includes(key)
            )
              return [];
            seen.add(key);
            return [
              {
                date,
                ...(r.amount === null ? {} : { amountUsd: r.amount * 1e6 }),
                round: r.round ?? "Round not specified",
                source: {
                  label: "DefiLlama funding records",
                  url,
                  kind: "Data provider",
                },
              },
            ];
          })
          .sort((a, b) => b.date.localeCompare(a.date));
        if (rounds.length)
          record.funding = { scopeNote: source.scopeNote, rounds };
      } else {
        const raw = snapshot.records[id].revenue!;
        const peaks = observedRevenuePeaks(raw.daily, cutoff);
        if (peaks)
          record.revenue = {
            ...peaks,
            scopeNote: source.scopeNote,
            source: {
              label: "DefiLlama daily revenue series",
              url,
              kind: "Data provider",
            },
            ...(raw.methodologyUrl
              ? { methodologyUrl: raw.methodologyUrl }
              : {}),
          };
      }
    }
    if (mapping.manualFunding)
      record.funding = {
        scopeNote: mapping.manualFunding.scopeNote,
        rounds: mapping.manualFunding.rounds
          .filter((r) => r.date <= cutoff)
          .sort((a, b) => b.date.localeCompare(a.date)),
      };
    if (record.funding || record.revenue) records[id] = record;
  }
  // Fetch/validate every source before writing; failed requests never erase existing figures.
  await writeFile(
    "app/rip/financial-data.json",
    JSON.stringify({ reviewedAt: snapshot.reviewedAt, records }, null, 2) + "\n"
  );
  if (!offline)
    await writeFile(
      "docs/rip/financial-snapshot.json",
      JSON.stringify(snapshot) + "\n"
    );
  console.log(
    `Financial snapshot: ${Object.values(records).filter((r) => r.funding).length} funding records, ${Object.values(records).filter((r) => r.revenue?.peakMonth).length} monthly peaks, ${Object.values(records).filter((r) => r.revenue?.peakYear).length} annual peaks.`
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
