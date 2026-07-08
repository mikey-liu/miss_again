import json
import math
import os
from PIL import Image


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONCEPT_DIR = os.path.join(ROOT, "assets", "concepts")
OUT_DIR = os.path.join(ROOT, "assets", "runtime")


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


def open_concept(name):
    return Image.open(os.path.join(CONCEPT_DIR, name)).convert("RGBA")


def crop_save(src_name, out_name, box, transparent=False, tolerance=44, max_height=None):
    img = open_concept(src_name)
    crop = img.crop(box)
    if transparent:
        crop = remove_flat_background(crop, tolerance)
    if max_height and crop.height > max_height:
        scale = max_height / crop.height
        crop = crop.resize((round(crop.width * scale), max_height), Image.Resampling.LANCZOS)
    out_path = os.path.join(OUT_DIR, out_name)
    ensure_dir(os.path.dirname(out_path))
    save_optimized_png(crop, out_path)
    return {
        "file": out_name.replace("\\", "/"),
        "source": src_name,
        "box": list(box),
        "width": crop.width,
        "height": crop.height,
    }


def color_distance(a, b):
    return math.sqrt(sum((int(a[i]) - int(b[i])) ** 2 for i in range(3)))


def remove_flat_background(img, tolerance):
    pixels = img.load()
    w, h = img.size
    samples = [
        pixels[0, 0],
        pixels[w - 1, 0],
        pixels[0, h - 1],
        pixels[w - 1, h - 1],
        pixels[w // 2, 0],
        pixels[w // 2, h - 1],
    ]
    bg = tuple(sorted(channel)[len(channel) // 2] for channel in zip(*[s[:3] for s in samples]))

    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            dist = color_distance((r, g, b), bg)
            bright = r > 220 and g > 205 and b > 170
            if dist < tolerance or (bright and dist < tolerance * 1.75):
                pixels[x, y] = (r, g, b, 0)
            elif dist < tolerance * 1.35:
                pixels[x, y] = (r, g, b, int(a * 0.45))

    return trim_alpha(img)


def trim_alpha(img, padding=4):
    bbox = img.getbbox()
    if not bbox:
        return img
    left, top, right, bottom = bbox
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(img.width, right + padding)
    bottom = min(img.height, bottom + padding)
    return img.crop((left, top, right, bottom))


def save_optimized_png(img, path):
    try:
        quantized = img.quantize(colors=128, method=Image.Quantize.FASTOCTREE)
        quantized.save(path, optimize=True)
    except Exception:
        img.save(path, optimize=True)


def main():
    ensure_dir(OUT_DIR)
    manifest = {"screens": {}, "sprites": {}, "ui": {}}

    # Full-screen UI mockups. These retain the approved visual style and become
    # the base art that the Canvas renderer overlays with live text/hit areas.
    screens = [
        ("loading-menu-screens-board.png", "screens/loading.png", (18, 24, 435, 852), 760),
        ("loading-menu-screens-board.png", "screens/menu.png", (462, 24, 878, 852), 760),
        ("gameplay-hud-result-screens-board.png", "screens/gameplay_level1.png", (28, 38, 457, 824), 760),
        ("gameplay-hud-result-screens-board.png", "screens/gameplay_level2.png", (486, 38, 915, 824), 760),
        ("gameplay-hud-result-screens-board.png", "screens/pause.png", (944, 38, 1373, 824), 760),
        ("gameplay-hud-result-screens-board.png", "screens/result.png", (1402, 38, 1820, 824), 760),
        ("overworld-map-background.png", "screens/level_map.png", (0, 0, 941, 1672), 1200),
    ]
    for src, out, box, max_height in screens:
        item = crop_save(src, out, box, max_height=max_height)
        manifest["screens"][os.path.splitext(os.path.basename(out))[0]] = item

    # Target and ring sprites from the approved sprite sheet.
    sprites = [
        ("pumpkin", (22, 32, 195, 190)),
        ("tomato", (228, 42, 405, 190)),
        ("eggplant", (438, 22, 615, 195)),
        ("cabbage", (630, 28, 835, 198)),
        ("corn", (850, 24, 1030, 198)),
        ("carrot", (1060, 25, 1195, 198)),
        ("mushroom", (28, 238, 200, 412)),
        ("strawberry", (228, 232, 410, 424)),
        ("radish", (440, 245, 610, 425)),
        ("watermelon", (638, 238, 838, 428)),
        ("apple", (850, 244, 1030, 420)),
        ("grapes", (1038, 242, 1220, 425)),
        ("ring_rest", (28, 480, 210, 590)),
        ("ring_tilt", (240, 448, 430, 590)),
        ("ring_hit", (606, 435, 890, 610)),
        ("ring_bounce", (918, 440, 1165, 610)),
    ]
    for name, box in sprites:
        item = crop_save(
            "targets-effects-slice-board.png",
            f"sprites/{name}.png",
            box,
            transparent=True,
            tolerance=52,
        )
        manifest["sprites"][name] = item

    # UI fragments that can be reused for overlays while the rest of the screen
    # remains based on the full mockup art.
    ui_items = [
        ("panel_wide", (638, 104, 1145, 224)),
        ("button_yellow", (60, 284, 276, 360)),
        ("button_green", (60, 388, 276, 462)),
        ("button_red", (60, 492, 276, 566)),
        ("hud_ring", (58, 708, 420, 766)),
        ("hud_score", (58, 806, 420, 864)),
        ("speech", (60, 1046, 410, 1135)),
        ("result_panel", (446, 632, 815, 958)),
    ]
    for name, box in ui_items:
        item = crop_save(
            "ui-components-slice-board.png",
            f"ui/{name}.png",
            box,
            transparent=True,
            tolerance=50,
        )
        manifest["ui"][name] = item

    with open(os.path.join(OUT_DIR, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"Generated runtime assets in {OUT_DIR}")
    print(json.dumps({k: len(v) for k, v in manifest.items()}, ensure_ascii=False))


if __name__ == "__main__":
    main()
