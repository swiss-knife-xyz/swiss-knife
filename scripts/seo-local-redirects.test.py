"""Category redirects retain localhost/preview origins, independent of build mode."""
import os
import unittest
import urllib.request
import urllib.error

ORIGIN = os.environ.get("SEO_TEST_ORIGIN", "http://127.0.0.1:3212")
TOOLS = {
    "calldata": "decoder", "converter": "eth", "ens": "history",
    "foundry": "forge-stack-tracer-ui", "safe": "eip-712-hash",
    "solidity": "compiler", "transact": "send-tx",
    "uniswap": "tick-to-price", "wallet": "bridge",
}

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

class LocalCategoryRedirects(unittest.TestCase):
    def test_redirects_stay_on_local_or_preview_origin(self):
        opener = urllib.request.build_opener(NoRedirect)
        for host in ["127.0.0.1:3212", "localhost:3212", "[::1]:3212", "seo-review.vercel.app"]:
            for base, tool in TOOLS.items():
                with self.subTest(host=host, base=base):
                    req = urllib.request.Request(f"{ORIGIN}/{base}", headers={"Host": host})
                    try:
                        response = opener.open(req, timeout=30)
                    except urllib.error.HTTPError as error:
                        response = error
                    with response:
                        self.assertEqual(response.status, 308)
                        self.assertEqual(response.headers.get("Location"), f"/{base}/{tool}")

if __name__ == "__main__":
    unittest.main()
