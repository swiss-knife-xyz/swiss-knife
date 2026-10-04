#!/usr/bin/env python3
"""Crawl the local app's sitemap (never production) and retain SEO evidence."""
import argparse
import json
import struct
import sys
import urllib.request
import urllib.error
import urllib.parse
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.h1 = 0
        self.links = []
        self.meta = {}
        self.canonical = None
        self.stack = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        hidden = "hidden" in attrs or any(hidden for _, hidden in self.stack)
        if tag not in {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}:
            self.stack.append((tag, hidden))
        if tag == "h1" and not hidden: self.h1 += 1
        if tag == "a" and attrs.get("href") and not hidden: self.links.append(attrs["href"])
        if tag == "meta": self.meta[attrs.get("property", attrs.get("name"))] = attrs.get("content")
        if tag == "link" and attrs.get("rel") == "canonical": self.canonical = attrs.get("href")
    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl): return None

parser = argparse.ArgumentParser()
parser.add_argument("--base", default="http://127.0.0.1:3212")
parser.add_argument("--output", required=True)
parser.add_argument("--hosts", action="store_true")
parser.add_argument("--images", action="store_true")
parser.add_argument("--strict", action="store_true")
args = parser.parse_args()
assert urllib.parse.urlparse(args.base).hostname in ("localhost", "127.0.0.1"), "Local app only"
opener = urllib.request.build_opener(NoRedirect())

def fetch(path, host=None):
    request = urllib.request.Request(args.base + path, headers={"User-Agent": "SEO-local-review", **({"Host": host} if host else {})})
    try:
        response = opener.open(request, timeout=180)
    except urllib.error.HTTPError as error:
        response = error
    return response.status, {key.lower(): value for key, value in response.headers.items()}, response.read()

status, _, data = fetch("/sitemap.xml")
assert status == 200, status
urls = [node.text for node in ET.fromstring(data).iter() if node.tag.endswith("}loc") and node.text is not None]
assert len(urls) == len(set(urls)), "Duplicate sitemap URLs"
records = []
image_cache = {}
seen = set()
for url in urls:
    parsed = urllib.parse.urlparse(url)
    assert parsed.hostname is not None
    path = parsed.path
    if not args.hosts and parsed.hostname != "eth.sh":
        path = "/" + parsed.hostname.split(".")[0] + (path if path != "/" else "")
    try:
        status, headers, body = fetch(path, parsed.hostname if args.hosts else None)
        page = Page(); page.feed(body.decode("utf8"))
        issues = []
        if status != 200: issues.append("status")
        if page.h1 != 1: issues.append("h1")
        if (page.canonical or "").rstrip("/") != url.rstrip("/"): issues.append("canonical")
        for key in ["description", "og:title", "og:description", "og:type", "og:url", "og:site_name", "og:image", "twitter:card", "twitter:image"]:
            if not page.meta.get(key): issues.append(key)
        if not page.links: issues.append("outgoing-links")
        seen.update(urllib.parse.urljoin(url, link).rstrip("/") for link in page.links)
        image_result = None
        if args.images and page.meta.get("og:image"):
            image = page.meta["og:image"]
            if image not in image_cache:
                image_url = urllib.parse.urlparse(image)
                if image_url.hostname != "eth.sh":
                    image_cache[image] = {"status": "non-apex image URL"}
                else:
                    image_status, image_headers, image_body = fetch(image_url.path + ("?" + image_url.query if image_url.query else ""), "eth.sh" if args.hosts else None)
                    image_cache[image] = {"status": image_status, "type": image_headers.get("content-type"), "dimensions": list(struct.unpack(">II", image_body[16:24])) if image_body.startswith(b"\x89PNG") else None}
            image_result = image_cache[image]
            if image_result["status"] != 200 or not image_result.get("dimensions"): issues.append("image-response")
        records.append({"url": url, "path": path, "status": status, "h1": page.h1, "canonical": page.canonical, "image": page.meta.get("og:image"), "links": len(page.links), "imageResponse": image_result, "issues": issues})
    except Exception as error:
        records.append({"url": url, "path": path, "issues": [str(error)]})
    Path(args.output).write_text(json.dumps(records, indent=2) + "\n")
    print(json.dumps(records[-1]), flush=True)
orphans = sorted(url for url in urls if url.rstrip("/") not in seen)
print(json.dumps({"total": len(records), "clean": sum(not row["issues"] for row in records), "notLinkedFromCrawl": orphans}, indent=2))
if args.strict and (orphans or any(row["issues"] for row in records)): sys.exit(1)
