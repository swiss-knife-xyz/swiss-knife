"""Export ETH.sh brand assets. Run: uv run --with fonttools brand-assets/export.py
Requires rsvg-convert (librsvg). Uses the repository's existing Poppins fonts.
"""
from pathlib import Path
import shutil
import subprocess
from xml.sax.saxutils import escape

from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(__file__).resolve().parent
BOLD = TTFont(ROOT / "assets/Poppins-Bold.ttf")
LIGHT = TTFont(ROOT / "assets/Poppins-Light.ttf")


def text(label, font, size, x, baseline, fill, rotate=0):
    """Outline text so the editable SVG renders identically without installed fonts."""
    scale = size / font["head"].unitsPerEm
    glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
    cursor = 0
    paths = []
    for char in label:
        name = cmap[ord(char)]
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(pen)
        paths.append(f'<path transform="translate({cursor} 0)" d="{pen.getCommands()}"/>')
        cursor += glyphs[name].width
    return (f'<g aria-label="{escape(label)}" fill="{fill}" '
            f'transform="translate({x} {baseline}) rotate({rotate}) scale({scale} {-scale})">'
            + ''.join(paths) + '</g>')


def raster(svg, png, size=None):
    args = ["rsvg-convert"]
    if size:
        args += ["-w", str(size), "-h", str(size)]
    subprocess.run(args + [str(svg), "-o", str(png)], check=True)


logo = (ROOT / "public/logo.svg").read_text()
shutil.copyfile(ROOT / "public/logo.svg", OUT / "logo.svg")
raster(OUT / "logo.svg", OUT / "logo.png", 1024)

# More prominent in a circular profile crop, while keeping the diamond tips safe.
profile = logo.replace('viewBox="0 0 512 512"', 'viewBox="48 48 416 416"')
profile = profile.replace('<title>ETH.sh</title>', '<title>ETH.sh profile image</title>\n  <rect x="48" y="48" width="416" height="416" fill="#101010"/>')
(OUT / "twitter-profile.svg").write_text(profile)
raster(OUT / "twitter-profile.svg", OUT / "twitter-profile.png", 400)

parts = ['''<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="500" viewBox="0 0 1500 500" role="img" aria-labelledby="title desc">
<title id="title">ETH.sh — The Ultimate Ethereum Toolkit</title>
<desc id="desc">The red and white Ethereum mark with the ETH.sh wordmark and tagline, surrounded by subtle developer tool names on charcoal.</desc>
<defs><radialGradient id="glow"><stop stop-color="#E84142" stop-opacity=".13"/><stop offset="1" stop-color="#E84142" stop-opacity="0"/></radialGradient></defs>
<rect width="1500" height="500" fill="#111111"/>
<ellipse cx="620" cy="245" rx="510" ry="340" fill="url(#glow)"/>
''']
for label, x, baseline, size, rotate in [
    ("Explorer", 38, 137, 61, -19),
    ("Calldata Decoder", 1030, 70, 52, 14),
    ("Storage Slots", 650, 85, 23, -4),
    ("Wallet Bridge", 65, 387, 30, 13),
    ("Transact", 490, 431, 28, -12),
    ("Unit Converter", 880, 404, 34, 11),
    ("Constants", 1240, 365, 26, -12),
]:
    parts.append(text(label, BOLD, size, x, baseline, "#303030", rotate))
# Native mark geometry from the canonical logo, with no embedded bitmap.
mark = logo.split('<title>ETH.sh</title>')[1].split('</svg>')[0]
parts.append('<svg x="435" y="159" width="105" height="165" viewBox="136 68 240 376">' + mark + '</svg>')
parts.append(text("ETH.sh", BOLD, 112, 579, 256, "#F5F4EF"))
parts.append(text("The Ultimate Ethereum Toolkit", LIGHT, 28, 579, 303, "#E4E2DF"))
parts.append('</svg>')
(OUT / "twitter-banner.svg").write_text('\n'.join(parts))
raster(OUT / "twitter-banner.svg", OUT / "twitter-banner.png")
print('Exported transparent logo, profile image, and Twitter banner to', OUT)
