"""Makes the Sue's Gift store's print artwork (../images/art/) from the
Sue's Gift logo (src/sues-gift-logo.png, from suesgift.org).

    python3 site-src/stores/suesgift/tools/art.py <folder with the TTFs>

The folder holds Literata-400.ttf, Literata-400i.ttf, Literata-600.ttf and
Montserrat-700/800/900.ttf (Google Fonts, SIL OFL). Montserrat is the type on
suesgift.org; Literata is the store's serif.

Every design comes twice: <name>.webp for light garments (teal and ink, as
designed) and <name>-white.webp, a one-colour white print for dark
garments. In the white versions the logo's teal disc drops out, leaving its
ring and heart in white. catalog.mjs picks one by the garment's colour.
Needs Pillow and numpy. Run it only when a design changes.
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "images", "art")
FONTS = sys.argv[1] if len(sys.argv) > 1 else sys.exit(__doc__)
os.makedirs(OUT, exist_ok=True)

TEAL = (0, 140, 149, 255)   # suesgift.org's teal
DEEP = (0, 98, 106, 255)    # a deeper teal for one-colour type on pale garments
INK = (37, 39, 41, 255)
WHITE = (255, 255, 255, 255)
font = lambda name, size: ImageFont.truetype(os.path.join(FONTS, name), size)

logo = Image.open(os.path.join(HERE, "src", "sues-gift-logo.png")).convert("RGBA")
CIRCLE = (11, 7, 298, 294)  # the round mark, in the 750x300 logo


def circle_mask(w, h, inset=0):
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).ellipse((1 + inset, 1 + inset, w - 2 - inset, h - 2 - inset), fill=255)
    return np.asarray(m) > 0


def heart_alpha(img):
    """The white heart inside the mark: light, unsaturated pixels."""
    a = np.asarray(img).astype(int)
    lum = a[..., :3].mean(2)
    sat = a[..., :3].max(2) - a[..., :3].min(2)
    return np.clip((lum - 150) * 2.2, 0, 255) * (sat < 70) * (a[..., 3] > 0)


def badge(white):
    b = logo.crop(CIRCLE)
    w, h = b.size
    a = np.asarray(b).copy()
    a[..., 3] = np.minimum(a[..., 3], circle_mask(w, h) * 255)
    if white:
        inner = circle_mask(w, h, 22)
        alpha = np.where(inner, heart_alpha(b), a[..., 3])
        a = np.zeros_like(a)
        a[..., :3] = 255
        a[..., 3] = alpha
    return Image.fromarray(a.astype(np.uint8))


def full_logo(white):
    if not white:
        return logo.copy()
    a = np.asarray(logo).copy()
    x0, y0, x1, y1 = CIRCLE
    mark = np.asarray(badge(True))
    alpha = a[..., 3].astype(float)
    alpha[y0:y1, x0:x1] = np.where(circle_mask(x1 - x0, y1 - y0), mark[..., 3], alpha[y0:y1, x0:x1])
    out = np.zeros_like(a)
    out[..., :3] = 255
    out[..., 3] = alpha.astype(np.uint8)
    return Image.fromarray(out)


def heart(colour):
    b = logo.crop(CIRCLE)
    w, h = b.size
    alpha = heart_alpha(b) * circle_mask(w, h, 30)
    a = np.zeros((h, w, 4), np.uint8)
    a[..., :3] = colour[:3]
    a[..., 3] = alpha.astype(np.uint8)
    im = Image.fromarray(a)
    return im.crop(im.getbbox())


def line(text, name, size, colour, tracking=0):
    f = font(name, size)
    widths = [f.getlength(ch) for ch in text]
    asc, desc = f.getmetrics()
    im = Image.new("RGBA", (int(sum(widths) + tracking * len(text)) + 8, asc + desc + 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    x = 0
    for ch, wd in zip(text, widths):
        d.text((x, 0), ch, font=f, fill=colour)
        x += wd + tracking
    return im.crop(im.getbbox())


def stack(items, gap):
    w = max(i.width for i in items)
    h = sum(i.height for i in items) + gap * (len(items) - 1)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    y = 0
    for i in items:
        out.alpha_composite(i, ((w - i.width) // 2, y))
        y += i.height + gap
    return out


def width(im, w):
    return im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)


def one_colour(im, colour=WHITE):
    a = np.asarray(im).copy()
    a[..., :3] = colour[:3]
    return Image.fromarray(a)


def golf_ball(colour):
    s = 300
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((10, 10, s - 10, s - 10), outline=colour, width=16)
    for i in range(7):
        for j in range(7):
            x, y = 60 + j * 30 + (15 if i % 2 else 0), 60 + i * 30
            if (x - 150) ** 2 + (y - 150) ** 2 < 105 ** 2:
                d.ellipse((x - 7, y - 7, x + 7, y + 7), fill=colour)
    return im


DESIGNS = {}

# You're Not Alone: heart on the chest, the line from suesgift.org on the back.
DESIGNS["heart"] = lambda white: heart(WHITE if white else TEAL)
DESIGNS["not-alone"] = lambda white: one_colour(stack([
    stack([line("You’re not", "Literata-400i.ttf", 220, WHITE), line("alone.", "Literata-400i.ttf", 220, WHITE)], 20),
    line("SUE’S GIFT  ·  GYNECOLOGIC CANCER SUPPORT", "Montserrat-700.ttf", 52, WHITE, 8)], 70), WHITE if white else DEEP)

# Be Ovary Aware: the 19th annual 5K run + 3K walk, and its own tagline.
DESIGNS["boa-front"] = lambda white: one_colour(stack([
    width(heart(WHITE), 260),
    stack([line("Be Ovary", "Literata-600.ttf", 230, WHITE), line("Aware", "Literata-400i.ttf", 260, WHITE)], 0),
    stack([line("19TH ANNUAL 5K RUN + 3K WALK", "Montserrat-800.ttf", 62, WHITE, 10), line("COLORADO SPRINGS  ·  2027", "Montserrat-700.ttf", 50, WHITE, 10)], 28)], 50), WHITE if white else DEEP)
DESIGNS["boa-back"] = lambda white: one_colour(stack([
    stack([line("Together, we run.", "Literata-400i.ttf", 150, WHITE), line("Together, we walk.", "Literata-400i.ttf", 150, WHITE), line("Together, we fight.", "Literata-600.ttf", 150, WHITE)], 34),
    line("BENEFITING SUE’S GIFT GYNECOLOGIC CANCER SUPPORT", "Montserrat-700.ttf", 44, WHITE, 6)], 80), WHITE if white else DEEP)

# TEAL Tee-Off: the charity golf tournament.
def teeoff_back(white):
    t, k = (WHITE, WHITE) if white else (TEAL, INK)
    return stack([golf_ball(k), stack([line("TEAL", "Montserrat-900.ttf", 300, t, 18), line("TEE-OFF", "Montserrat-900.ttf", 190, k, 12)], 14),
                  stack([line("7TH ANNUAL CHARITY GOLF TOURNAMENT", "Montserrat-700.ttf", 54, k, 8), line("Golf for good with Sue’s Gift", "Literata-400i.ttf", 70, t)], 30)], 50)
def teeoff_chest(white):
    k = WHITE if white else INK
    return stack([width(golf_ball(k), 120), line("TEAL TEE-OFF", "Montserrat-900.ttf", 90, k, 6)], 24)
DESIGNS["teeoff-back"] = teeoff_back
DESIGNS["teeoff-chest"] = teeoff_chest

# A Toast to TEAL: the survivorship celebration.
def toast(white):
    t, k = (WHITE, WHITE) if white else (TEAL, INK)
    return stack([stack([line("Cheers", "Literata-400i.ttf", 240, t), line("to you.", "Literata-400i.ttf", 240, t)], 10),
                  line("A TOAST TO TEAL  ·  SURVIVORSHIP CELEBRATION", "Montserrat-700.ttf", 50, k, 8)], 60)
DESIGNS["toast"] = toast

# The logo, the round badge, and the tote's badge over a wordmark.
DESIGNS["logo"] = full_logo
DESIGNS["badge"] = badge
def tote(white):
    k, t = (WHITE, WHITE) if white else (INK, TEAL)
    return stack([width(badge(white), 420), line("Sue’s Gift", "Literata-400.ttf", 170, k), line("GYNECOLOGIC CANCER SUPPORT", "Montserrat-700.ttf", 46, t, 10)], 40)
DESIGNS["tote"] = tote

for name, make in DESIGNS.items():
    for white in (False, True):
        im = make(white)
        if im.width > 1200:
            im = width(im, 1200)
        path = os.path.join(OUT, f"{name}{'-white' if white else ''}.webp")
        im.save(path, "WEBP", quality=90, method=6)
        print(os.path.relpath(path, os.path.join(HERE, "..")), im.size)
