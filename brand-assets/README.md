# ETH.sh brand assets

| File | Use |
| --- | --- |
| `logo.png` | 1024×1024 transparent export of the canonical mark. |
| `twitter-profile.png` | 400×400 profile image, dark background with room for a circular crop. |
| `twitter-banner.png` | 1500×500 profile header, matching the original homepage OG style. |
| `logo.svg` | Copy of the canonical `public/logo.svg`. |
| `twitter-profile.svg` | Vector source for the profile image. |
| `twitter-banner.svg` | Vector banner source; text is outlined for consistent rendering. |

The banner keeps its main mark, wordmark, and tagline away from the lower-left
profile-photo overlap and within the central vertical area to accommodate cropping.
Dimensions follow [X's upload guidance](https://help.x.com/en/managing-your-account/common-issues-when-uploading-profile-photo).

## Regenerate

From the repository root, with `uv` and `rsvg-convert` (librsvg) installed:

```bash
uv run --with fonttools brand-assets/export.py
```

The exporter reads `public/logo.svg` and the existing Poppins fonts in `assets/`.
Edit the banner layout in `export.py` before regenerating. Poppins licensing is
recorded in `assets/Poppins-OFL.txt`.
