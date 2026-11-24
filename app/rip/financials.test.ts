import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { shutdownProjects } from "./data";
import {
  disclosedFunding,
  fundingIsApproximate,
  financials,
  observedRevenuePeaks,
} from "./financials";

function series(
  start: string,
  end: string,
  amount = 1
): [number, number | null][] {
  const rows: [number, number | null][] = [];
  for (
    const day = new Date(start);
    day < new Date(end);
    day.setUTCDate(day.getUTCDate() + 1)
  )
    rows.push([day.getTime() / 1000, amount]);
  return rows;
}

test("peaks use actual complete calendar periods including leap days and losses", () => {
  const daily = series("2024-01-01", "2025-02-01");
  daily[0][1] = -10;
  const result = observedRevenuePeaks(daily, "2025-02-01")!;
  assert.deepEqual(result.peakYear, { period: "2024", amountUsd: 355 });
  assert.deepEqual(result.peakMonth, { period: "2024-03", amountUsd: 31 });
  assert.equal(
    observedRevenuePeaks(series("2024-02-01", "2024-03-01"), "2024-03-01")!
      .peakMonth?.amountUsd,
    29
  );
});

test("missing, null, current and post-cutoff days never become zero revenue", () => {
  const daily = series("2025-01-01", "2025-03-01");
  daily[5][1] = null;
  assert.deepEqual(observedRevenuePeaks(daily, "2025-03-01")!.peakMonth, {
    period: "2025-02",
    amountUsd: 28,
  });
  daily.splice(40, 1);
  assert.equal(observedRevenuePeaks(daily, "2025-03-01")!.peakMonth, undefined);
  assert.equal(
    observedRevenuePeaks(series("2025-01-01", "2025-02-01"), "2025-01-31")!
      .peakMonth,
    undefined
  );
  assert.equal(
    observedRevenuePeaks(series("2025-01-01", "2025-02-01"), "2025-02-01")!
      .peakYear,
    undefined
  );
  assert.equal(observedRevenuePeaks([], "2025-02-01"), undefined);
  const rows = series("2025-01-01", "2025-02-01");
  assert.throws(
    () => observedRevenuePeaks([...rows, rows[0]], "2025-02-01"),
    /Duplicate/
  );
  assert.throws(
    () => observedRevenuePeaks([[rows[0][0], NaN]], "2025-02-01"),
    /Invalid/
  );
});

test("unknown funding stays unknown; a sourced zero stays zero", () => {
  const source = {
    label: "Source",
    url: "https://example.com",
    kind: "Primary" as const,
  };
  assert.equal(disclosedFunding(), undefined);
  assert.equal(
    disclosedFunding({
      funding: {
        scopeNote: "",
        rounds: [{ date: "2025-01-01", round: "Seed", source }],
      },
    }),
    undefined
  );
  assert.equal(
    disclosedFunding({
      funding: {
        scopeNote: "",
        rounds: [{ date: "2025-01-01", round: "Seed", amountUsd: 0, source }],
      },
    }),
    0
  );
});

test("published figures have sources and reproduce from the captured daily series", () => {
  const snapshot = JSON.parse(
    readFileSync("docs/rip/financial-snapshot.json", "utf8")
  );
  for (const [id, record] of Object.entries(financials)) {
    const project = shutdownProjects.find((p) => p.id === id);
    assert(project, `Unknown financial ID ${id}`);
    const cutoff =
      project.closed && project.closed < snapshot.reviewedAt
        ? project.closed
        : project.status === "Closed" && project.announced
          ? project.announced
          : snapshot.reviewedAt;
    for (const round of record.funding?.rounds ?? []) {
      assert.equal(new URL(round.source.url).protocol, "https:");
      assert.match(round.date, /^\d{4}(-\d{2}(-\d{2})?)?$/);
      assert(round.date <= cutoff);
      if (round.amountUsd !== undefined)
        assert(Number.isFinite(round.amountUsd) && round.amountUsd >= 0);
    }
    if (record.revenue) {
      assert.equal(new URL(record.revenue.source.url).hostname, "api.llama.fi");
      const expected = observedRevenuePeaks(
        snapshot.records[id].revenue.daily,
        cutoff
      )!;
      assert.deepEqual(record.revenue.peakMonth, expected.peakMonth);
      assert.deepEqual(record.revenue.peakYear, expected.peakYear);
      assert.equal(record.revenue.coverageStart, expected.coverageStart);
      assert.equal(record.revenue.coverageEnd, expected.coverageEnd);
    }
  }
  // Legend's app round comes from its own announcement, not Legend Trade.
  assert.equal(disclosedFunding(financials.legend), 15000000);
  assert.equal(
    new URL(financials.legend.funding!.rounds[0].source.url).pathname,
    "/@legendapp/legend-secures-15m-in-funding-to-bring-defi-mainstream"
  );
  // These provider/parent listings belong to different products.
  assert.equal(financials.rodeo, undefined);
  assert.equal(financials["magic-eden-wallet"], undefined);
});

test("approximate sale proceeds propagate to funding totals without counting undisclosed rounds", () => {
  const sophon = financials["sophon-chain"];
  assert.equal(disclosedFunding(sophon), 70000000);
  assert.equal(fundingIsApproximate(sophon), true);
  assert.equal(sophon.funding!.rounds[0].amountUsd, undefined);
  assert.equal(fundingIsApproximate(financials.legend), false);
  assert.equal(fundingIsApproximate(), false);
});
