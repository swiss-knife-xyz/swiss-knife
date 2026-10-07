import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { archiveReviewedAt, shutdownProjects } from "./data";

test("archive records have unique identities, usable evidence and valid dates", () => {
  const ids = new Set<string>();
  for (const project of shutdownProjects) {
    assert(!ids.has(project.id), `Duplicate project: ${project.id}`);
    ids.add(project.id);
    assert.match(project.id, /^[a-z0-9-]+$/);
    assert(project.sources.length > 0, `No evidence for ${project.id}`);
    for (const source of project.sources)
      assert.equal(new URL(source.url).protocol, "https:");
    for (const date of [project.announced, project.closed].filter(Boolean)) {
      assert.match(date!, /^\d{4}-\d{2}-\d{2}$/);
      assert.equal(
        new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10),
        date
      );
    }
    if (project.status === "Closed" && project.closed) {
      assert(
        project.closed <= archiveReviewedAt,
        `Future closure marked closed: ${project.id}`
      );
    }
    if (project.announced)
      assert(
        project.announced <= archiveReviewedAt,
        `Future announcement: ${project.id}`
      );
    if (project.logo) {
      assert(project.logo.startsWith("/external/rip/"));
      assert(
        existsSync(path.join(process.cwd(), "public", project.logo)),
        `Missing logo: ${project.logo}`
      );
    }
  }
});

test("known false-positive roundup claims stay outside the archive", () => {
  const ids = new Set(shutdownProjects.map((project) => project.id));
  for (const id of [
    "limitless",
    "storj",
    "beets",
    "story-protocol",
    "ygg",
    "immutable",
    "sleepagotchi",
    "genso-online",
  ]) {
    assert(
      !ids.has(id),
      `${id} requires actual shutdown evidence, not a pivot or roundup label`
    );
  }
});

test("every project has a downloaded logo with source provenance", () => {
  const ledger = JSON.parse(
    readFileSync(
      path.join(process.cwd(), "docs/rip/logo-provenance.json"),
      "utf8"
    )
  ) as { assets: { id: string; local: string; sources: string[] }[] };
  for (const project of shutdownProjects) {
    assert(project.logo, `Logo missing for ${project.id}`);
    const provenance = ledger.assets.find(
      (asset) => asset.id === project.id && asset.local === project.logo
    );
    assert(provenance?.sources.length, `Logo source missing for ${project.id}`);
    if (project.logoFrame) {
      const frame = project.logoFrame;
      assert(frame.width > 0 && frame.height > 0);
      assert(frame.left >= 0 && frame.top >= 0);
      assert(frame.left + frame.width <= frame.sourceWidth);
      assert(frame.top + frame.height <= frame.sourceHeight);
    }
  }
});
