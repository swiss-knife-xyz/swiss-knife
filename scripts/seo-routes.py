#!/usr/bin/env python3
"""HTTP acceptance checks for host-aware aliases, crawler assets and private metadata."""
import json
import re
import urllib.request
import urllib.error
from pathlib import Path

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl): return None
opener = urllib.request.build_opener(NoRedirect)
records = []
address = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
def check(host, path, status, location=None, canonical=None, noindex=False, robots=False):
    req = urllib.request.Request("http://127.0.0.1:3212" + path, headers={"Host": host})
    try: response = opener.open(req, timeout=30)
    except urllib.error.HTTPError as error: response = error
    body = response.read().decode("utf8", errors="replace")
    passed = response.status == status
    actual_location = response.headers.get("Location")
    if location is not None: passed = passed and actual_location == location
    if status == 404: passed = passed and actual_location is None
    if canonical:
        matches = re.findall(r'<link[^>]*rel="canonical"[^>]*href="([^"]+)"', body)
        passed = passed and any(value.rstrip("/") == canonical.rstrip("/") for value in matches)
    if noindex: passed = passed and 'content="noindex, nofollow"' in body and 'rel="canonical"' not in body
    if robots: passed = passed and response.headers.get("X-Robots-Tag") == "noindex, nofollow"
    records.append({"host": host, "path": path, "status": response.status, "location": actual_location, "expectedCanonical": canonical, "passed": bool(passed)})

check("contract.eth.sh", "/contract", 308, "https://contract.eth.sh/")
check("eth.sh", "/contract", 200, canonical="https://contract.eth.sh/")
check("contract.eth.sh", f"/1/{address}", 200, canonical=f"https://contract.eth.sh/1/{address}")
check("usdc-pay.eth.sh", "/", 200, canonical="https://usdc-pay.eth.sh/")
check("determine-address.eth.sh", "/", 200, canonical="https://determine-address.eth.sh/")
check("solidity.eth.sh", "/", 308, "https://solidity.eth.sh/compiler")
check("solidity.eth.sh", "/compiler", 200, canonical="https://solidity.eth.sh/compiler")
for base, tool in {"calldata": "decoder", "converter": "eth", "ens": "history", "foundry": "forge-stack-tracer-ui", "safe": "eip-712-hash", "transact": "send-tx", "uniswap": "tick-to-price", "wallet": "bridge"}.items():
    check(f"{base}.eth.sh", "/", 308, f"https://{base}.eth.sh/{tool}")
check("orgs.eth.sh", "/", 308, "https://eth.sh/orgs")
check("eth.sh", "/orgs", 200, canonical="https://eth.sh/orgs")
check("explorer.eth.sh", f"/contract/1/{address}", 308, f"https://contract.eth.sh/1/{address}")
check("eth.sh", f"/explorer/contract/1/{address}", 308, f"https://contract.eth.sh/1/{address}")
check("explorer.eth.sh", f"/address/{address}", 200, canonical=f"https://explorer.eth.sh/address/{address}")
check("explorer.eth.sh", "/tx/0x" + "a" * 64, 200, canonical="https://explorer.eth.sh/tx/0x" + "a" * 64)
check("ens.eth.sh", "/history/vitalik.eth", 200, canonical="https://ens.eth.sh/history/vitalik.eth")
for host in ["eth.sh", "contract.eth.sh", "determine-address.eth.sh", "solidity.eth.sh", "usdc-pay.eth.sh"]:
    check(host, "/robots.txt", 200)
    check(host, "/sitemap.xml", 200)
    check(host, "/og/index.png", 200)
    check(host, "/not-a-tool-seo-audit", 404)
check("wallet.eth.sh", "/signatures/view", 200, noindex=True)
check("7702beat.eth.sh", "/test", 200, noindex=True)
check("skills.eth.sh", "/new", 200, noindex=True)
check("eth.sh", "/api/not-a-real-api-seo-audit", 404, robots=True)
Path("SEO_ROUTES.json").write_text(json.dumps(records, indent=2) + "\n")
print(json.dumps({"checks": len(records), "passed": sum(record["passed"] for record in records), "failures": [record for record in records if not record["passed"]]}, indent=2))
if not all(record["passed"] for record in records): raise SystemExit(1)
