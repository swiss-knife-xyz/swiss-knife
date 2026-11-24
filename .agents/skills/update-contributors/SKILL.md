---
name: update-contributors
description: Refresh generated homepage contributor data for swiss-knife from real Git/GitHub history. Use when Codex needs to update components/HomePage/SupportersPage/data/contributors.json, keep contributor counts current across master and v2, replace dummy contributor data, or verify contributor leaderboard data before committing homepage/supporters changes.
---

# Update Contributors

## Workflow

1. Run the updater from the repository root:

```bash
python3 .agents/skills/update-contributors/scripts/update_contributors.py
```

2. Review the generated diff:

```bash
git diff -- components/HomePage/SupportersPage/data/contributors.json
```

3. Run normal project checks:

```bash
pnpm exec tsc --noEmit
pnpm exec prettier --check components/HomePage/SupportersPage/data/contributors.json
```

4. Commit `contributors.json` only when the generated data looks correct.

## Data Source

Use Git commit history as the count source, not placeholder donations or manual ETH amounts. The default branch set is `origin/master` and `origin/v2`; if remote refs are missing, the script falls back to local `master` and `v2`.

Use GitHub profile metadata only for avatar/profile URLs. The script uses `gh auth token` or `GITHUB_TOKEN` when available, and falls back to public `https://github.com/{login}.png` avatar URLs if API lookup fails.

## Identity Aliases

The updater normalizes common local Git author identities to GitHub logins. If output contains a non-GitHub-looking author name, update the `DEFAULT_ALIASES` map in `scripts/update_contributors.py`, rerun the script, and validate the diff again.

For noreply emails like `123+login@users.noreply.github.com`, the script extracts `login` automatically.

## Useful Options

```bash
# Include a different number of contributors.
python3 .agents/skills/update-contributors/scripts/update_contributors.py --limit 30

# Use explicit refs.
python3 .agents/skills/update-contributors/scripts/update_contributors.py --branches origin/master origin/v2 HEAD

# Write somewhere else for inspection.
python3 .agents/skills/update-contributors/scripts/update_contributors.py --output /tmp/contributors.json

# Skip fetching remote refs.
python3 .agents/skills/update-contributors/scripts/update_contributors.py --no-fetch
```

## Constraints

- Do not hand-edit contribution counts.
- Do not reintroduce fake supporter/sponsor data into this generated contributor file.
- Keep output schema compatible with `ContributorsLeaderboard.tsx`: `rank`, `login`, `avatar`, `contributions`, `profileUrl`.
