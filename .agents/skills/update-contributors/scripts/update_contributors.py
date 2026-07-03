#!/usr/bin/env python3
"""Generate homepage contributor data from Git history and GitHub profiles."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from collections import Counter
from pathlib import Path
from typing import Any


DEFAULT_OUTPUT = Path("components/HomePage/SupportersPage/data/contributors.json")
DEFAULT_BRANCHES = ["origin/master", "origin/v2"]
FALLBACK_BRANCHES = ["master", "v2"]
DEFAULT_LIMIT = 24

DEFAULT_ALIASES = {
    "latheyapoorv@gmail.com": "apoorvlathey",
    "apoorv@eth.sh": "apoorvlathey",
    "apoorv lathey": "apoorvlathey",
    "apoorvlathey": "apoorvlathey",
    "gs109690@gmail.com": "gopiinho",
    "gurpreet": "gopiinho",
    "anupriyalathey@gmail.com": "anupriyalathey",
    "90963726+anupriyalathey@users.noreply.github.com": "anupriyalathey",
    "anupriya@anupriyas-macbook-pro.local": "anupriyalathey",
    "anupriya lathey": "anupriyalathey",
    "anupriyalathey": "anupriyalathey",
    "24273561+caveman-eth@users.noreply.github.com": "caveman-eth",
    "aaron-desktop-k": "caveman-eth",
    "miguel@solarlabs.gg": "kinsyudev",
    "kinsyudev": "kinsyudev",
    "jorge@ktlxv.com": "Ktl-XV",
    "jorge perez": "Ktl-XV",
    "jorge pérez": "Ktl-XV",
    "crumb-assistant@agentmail.to": "crumb-trail",
    "crumb": "crumb-trail",
    "ohko4711@163.com": "ohko4711",
    "richard": "ohko4711",
    "d@niel.nyc": "DanielSinclair",
    "daniel sinclair": "DanielSinclair",
    "andreevmaxim@gmail.com": "cdump",
    "maxim andreev": "cdump",
    "8011362+pranavgarg01@users.noreply.github.com": "PranavGarg01",
    "pranav garg": "PranavGarg01",
    "55102840+dhairyasethi@users.noreply.github.com": "DhairyaSethi",
    "dhairya": "DhairyaSethi",
    "dhairya sethi": "DhairyaSethi",
    "5469870+stephancill@users.noreply.github.com": "stephancill",
    "stephan.cilliers@coinbase.com": "stephancill",
    "stephan cilliers": "stephancill",
    "45617686+yulafezmesi@users.noreply.github.com": "yulafezmesi",
    "mert certel": "yulafezmesi",
    "rac.sri25@gmail.com": "rac-sri",
    "rachit srivastava": "rac-sri",
    "136801346+darklord017@users.noreply.github.com": "DarkLord017",
    "sambhav jain": "DarkLord017",
    "47782945+jiojosbg@users.noreply.github.com": "JIOjosBG",
    "lourdrivera123@gmail.com": "lourdrivera123",
    "zemiel asma": "lourdrivera123",
    "alexander@seifdn.org": "alexander-sei",
    "alexander-sei": "alexander-sei",
    "esadyusufatik@gmail.com": "eyusufatik",
    "eyusufatik": "eyusufatik",
    "gabriel.kerekes@vacuumlabs.com": "gabrielKerekes",
    "gabrielkerekes": "gabrielKerekes",
    "matejpoklemba@gmail.com": "matejos",
    "matej poklemba": "matejos",
    "100954684+0xkermo@users.noreply.github.com": "0xKermo",
    "kermo": "0xKermo",
    "33121795+kemperino@users.noreply.github.com": "Kemperino",
    "kemperino": "Kemperino",
    "kaanuzdogan@hotmail.com": "kuzdogan",
    "kaan uzdogan": "kuzdogan",
    "kaan uzdoğan": "kuzdogan",
    "jacobrossfrantz@gmail.com": "jrfrantz",
    "jacob frantz": "jrfrantz",
    "138901341+iceanddust@users.noreply.github.com": "iceanddust",
    "ice and dust": "iceanddust",
    "benoitded82@hotmail.fr": "Benoitded",
    "benoitded": "Benoitded",
    "agfviggiano@gmail.com": "aviggiano",
    "antonio viggiano": "aviggiano",
    "angelagilhotra@gmail.com": "probablyangg",
    "angela gilhotra": "probablyangg",
    "francesco.andreoli@consensys.net": "andreolf",
    "francesco andreoli": "andreolf",
}

NOREPLY_RE = re.compile(
    r"^(?:(?P<id>\d+)\+)?(?P<login>[^@]+)@users\.noreply\.github\.com$",
    re.IGNORECASE,
)


def run(command: list[str], check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        check=check,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )


def fetch_refs() -> None:
    run(["git", "fetch", "origin", "master", "v2", "--quiet"], check=False)


def existing_refs(refs: list[str]) -> list[str]:
    existing = []
    for ref in refs:
        result = run(["git", "rev-parse", "--verify", "--quiet", ref], check=False)
        if result.returncode == 0:
            existing.append(ref)
    return existing


def normalize_key(value: str) -> str:
    return value.strip().lower()


def login_for_author(name: str, email: str, aliases: dict[str, str]) -> str:
    email_key = normalize_key(email)
    name_key = normalize_key(name)

    if email_key in aliases:
        return aliases[email_key]
    if name_key in aliases:
        return aliases[name_key]

    noreply_match = NOREPLY_RE.match(email_key)
    if noreply_match:
        return noreply_match.group("login")

    return name.strip()


def contributor_counts(branches: list[str], aliases: dict[str, str]) -> Counter[str]:
    result = run(
        [
            "git",
            "log",
            "--format=%H%x00%an%x00%ae",
            "--no-merges",
            *branches,
            "--",
        ]
    )
    counts: Counter[str] = Counter()
    seen_hashes: set[str] = set()

    for line in result.stdout.splitlines():
        parts = line.split("\0")
        if len(parts) != 3:
            continue
        commit_hash, author_name, author_email = parts
        if commit_hash in seen_hashes:
            continue
        seen_hashes.add(commit_hash)
        counts[login_for_author(author_name, author_email, aliases)] += 1

    return counts


def github_token() -> str | None:
    if os.environ.get("GITHUB_TOKEN"):
        return os.environ["GITHUB_TOKEN"]
    result = run(["gh", "auth", "token"], check=False)
    if result.returncode == 0 and result.stdout.strip():
        return result.stdout.strip()
    return None


def github_user(login: str, token: str | None) -> dict[str, Any]:
    request = urllib.request.Request(
        f"https://api.github.com/users/{login}",
        headers={
            "Accept": "application/vnd.github+json",
            **({"Authorization": f"Bearer {token}"} if token else {}),
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            data = json.loads(response.read().decode("utf-8"))
            return {
                "login": data.get("login") or login,
                "avatar": data.get("avatar_url") or f"https://github.com/{login}.png",
                "profileUrl": data.get("html_url") or f"https://github.com/{login}",
            }
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return {
            "login": login,
            "avatar": f"https://github.com/{login}.png",
            "profileUrl": f"https://github.com/{login}",
        }


def generate(branches: list[str], limit: int, fetch: bool) -> list[dict[str, Any]]:
    if fetch:
        fetch_refs()

    refs = existing_refs(branches)
    if not refs and branches == DEFAULT_BRANCHES:
        refs = existing_refs(FALLBACK_BRANCHES)
    if not refs:
        raise SystemExit(f"No valid refs found from: {', '.join(branches)}")

    counts = contributor_counts(refs, DEFAULT_ALIASES)
    token = github_token()
    rows = []

    sorted_counts = sorted(counts.items(), key=lambda item: (-item[1], item[0].lower()))
    for rank, (login, count) in enumerate(sorted_counts[:limit], start=1):
        profile = github_user(login, token)
        rows.append(
            {
                "rank": rank,
                "login": profile["login"],
                "avatar": profile["avatar"],
                "contributions": count,
                "profileUrl": profile["profileUrl"],
            }
        )

    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--limit", type=int, default=DEFAULT_LIMIT)
    parser.add_argument("--branches", nargs="+", default=DEFAULT_BRANCHES)
    parser.add_argument("--no-fetch", action="store_true")
    args = parser.parse_args()

    data = generate(args.branches, args.limit, fetch=not args.no_fetch)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, indent=2) + "\n")
    print(f"Wrote {len(data)} contributors to {args.output}")


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        print(error.stderr, file=sys.stderr)
        raise
