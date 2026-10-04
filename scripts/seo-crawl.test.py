"""Regression tests for HTML evidence parsing; run with python3 scripts/seo-crawl.test.py."""
import unittest
from pathlib import Path

namespace = {}
source = Path(__file__).with_name("seo-crawl.py").read_text().split("class NoRedirect")[0]
exec(source, namespace)
Page = namespace["Page"]

class SeoHtmlTest(unittest.TestCase):
    def test_streamed_hidden_content_does_not_duplicate_visible_heading(self):
        page = Page()
        page.feed('<h1>Calldata Decoder</h1><div hidden id="S:0"><div><h1>Calldata Decoder</h1></div></div>')
        self.assertEqual(page.h1, 1)

if __name__ == "__main__":
    unittest.main()
