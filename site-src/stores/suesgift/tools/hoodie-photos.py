"""Lays ARK's PC78H hoodie photos onto the 1000 px white square that
garment-maps.mjs reads.

ARK's product catalogue (ark-designer client/src/lib/products.ts) links each
PC78H colour's flat front and back: 667 x 1000 PNGs on a transparent backdrop.
This crops the empty band above and below, scales the hoodie to fill the
square's height, centres it on white and saves it as JPEG:

    python3 hoodie-photos.py <folder with pc78h_creme_flat_front.png, ...> <out folder>
    node garment-maps.mjs <out folder> hood-front,hood-back

Every PC78H colour is the same shot, so creme and jet black line up pixel for
pixel.
"""
import sys
from pathlib import Path

from PIL import Image

src, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
for colour, name in [("creme", "CREME"), ("jet_black", "JET_BLACK")]:
    for view in ["front", "back"]:
        im = Image.open(src / f"pc78h_{colour}_flat_{view}.png").convert("RGBA")
        im = im.crop((0, 30, 667, 870)).resize((794, 1000), Image.LANCZOS)
        square = Image.new("RGBA", (1000, 1000), (255, 255, 255, 255))
        square.alpha_composite(im, (103, 0))
        square.convert("RGB").save(out / f"PC78H_{name}_{view.upper()}.jpg", quality=97)
