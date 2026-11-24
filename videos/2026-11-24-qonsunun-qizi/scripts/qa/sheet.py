#!/usr/bin/env python3
"""Tile stills into a labelled contact sheet: sheet.py OUT.png W COLS file1 file2 ..."""
import sys
from PIL import Image, ImageDraw, ImageFont
out, w, cols, files = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4:]
h = int(w * 16 / 9)
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * (h + 26)), (30, 30, 30))
d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
except Exception:
    font = ImageFont.load_default()
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((w, h), Image.LANCZOS)
    x, y = (i % cols) * w, (i // cols) * (h + 26)
    sheet.paste(im, (x, y + 26))
    d.text((x + 6, y + 3), f.split('/')[-1], fill=(255, 220, 0), font=font)
sheet.save(out)
print(out, sheet.size)
