"""Category redirects retain localhost/preview origins, independent of build mode."""
import os
import unittest
import urllib.request
import urllib.error

ORIGIN = os.environ.get("SEO_TEST_ORIGIN", "http://127.0.0.1:3212")
TOOLS = {
    "calldata": "decoder", "converter": "eth", "ens": "history",
    "foundry": "forge-stack-tracer-ui", "safe": "eip-712-hash",
    "solidity": "compiler",
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

class TxMigrationRedirects(unittest.TestCase):
    def test_old_routes_preserve_all_query_parameters(self):
        query = "chainId=8453&calldata=0xa9059cbb&eth=0.01&tag=a&tag=b&empty=&url=https%3A%2F%2Fexample.com%2Fa%3Fx%3D1%26y%3D2"
        cases = [
            ("transact.eth.sh", "/", "https://tx.eth.sh/"),
            ("transact.eth.sh", "/send-tx", "https://tx.eth.sh/"),
            ("transact.eth.sh", "/nested/path", "https://tx.eth.sh/nested/path"),
            ("eth.sh", "/transact", "https://tx.eth.sh/"),
            ("www.eth.sh", "/transact/send-tx", "https://tx.eth.sh/"),
            ("localhost:3210", "/transact", "/tx"),
            ("localhost:3210", "/transact/send-tx", "/tx"),
            ("review.vercel.app", "/transact/send-tx", "/tx"),
            ("tx.eth.sh", "/send-tx", "https://tx.eth.sh/"),
            ("localhost:3210", "/tx/send-tx", "/tx"),
        ]
        opener = urllib.request.build_opener(NoRedirect)
        for host, path, target in cases:
            with self.subTest(host=host, path=path):
                req = urllib.request.Request(f"{ORIGIN}{path}?{query}", headers={"Host": host}, method="HEAD")
                try:
                    response = opener.open(req, timeout=30)
                except urllib.error.HTTPError as error:
                    response = error
                with response:
                    self.assertEqual(response.status, 308)
                    self.assertEqual(response.headers.get("Location"), f"{target}?{query}")

if __name__ == "__main__":
    unittest.main()
