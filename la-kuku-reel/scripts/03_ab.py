"""A/B sheets per shot: lanczos | lanczos+unsharp | realesrgan-x4plus | realesrnet-x4plus.

Middle frame of each shot, framed exactly as delivered (1080x1920), ROI shown at 200%.
"""
import cv2
import numpy as np

from config import QA, WORK
from fitlib import fit, read_rgb, unsharp_luma, write_rgb8

MID = {"S1": 50, "S2": 47, "S3": 44, "S4": 24, "S5": 60}
ROI = {"S1": (300, 1120, 360, 320), "S2": (420, 480, 360, 320), "S3": (200, 1150, 360, 320),
       "S4": (300, 700, 420, 340), "S5": (330, 860, 420, 260)}   # x, y, w, h in 1080x1920
MODELS = ["realesrgan-x4plus", "realesrnet-x4plus"]


def label(img, text):
    img = (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)
    cv2.rectangle(img, (0, 0), (img.shape[1], 34), (0, 0, 0), -1)
    cv2.putText(img, text, (8, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 80), 2, cv2.LINE_AA)
    return img.astype(np.float32) / 255


def candidates(shot):
    n = MID[shot]
    src = read_rgb(WORK / "frames" / shot / f"{n:06d}.png")
    lz = fit(src)
    c = {"lanczos": lz, "lanczos+unsharp 0.5": unsharp_luma(lz, 0.5)}
    for m in MODELS:
        c[m] = fit(read_rgb(WORK / "ab" / m / shot / f"{n:06d}.png"))
    return c


def main():
    QA.mkdir(exist_ok=True)
    for shot in MID:
        c = candidates(shot)
        x, y, w, h = ROI[shot]
        crops = [label(cv2.resize(v[y:y + h, x:x + w], (w * 2, h * 2), interpolation=cv2.INTER_NEAREST), k)
                 for k, v in c.items()]
        sheet = np.concatenate([np.concatenate(crops[:2], 1), np.concatenate(crops[2:], 1)], 0)
        write_rgb8(QA / f"ab_{shot}.png", sheet)
        print("wrote", QA / f"ab_{shot}.png", sheet.shape)


if __name__ == "__main__":
    main()
