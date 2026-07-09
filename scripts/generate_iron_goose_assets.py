import json
import math
import os
import random
import wave
from array import array

from PIL import Image, ImageDraw


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "assets", "iron_goose")
MAP_DIR = os.path.join(OUT_DIR, "maps")
SPRITE_DIR = os.path.join(OUT_DIR, "sprites")
ICON_DIR = os.path.join(OUT_DIR, "icons")
AUDIO_DIR = os.path.join(OUT_DIR, "audio")
SAMPLE_RATE = 22050


def ensure_dirs():
    for path in (MAP_DIR, SPRITE_DIR, ICON_DIR, AUDIO_DIR):
        os.makedirs(path, exist_ok=True)


def save_png(img, folder, name):
    path = os.path.join(folder, name)
    img.save(path, "PNG", optimize=True)
    return rel(path)


def rel(path):
    return os.path.relpath(path, ROOT).replace("\\", "/")


def rounded(draw, xy, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def ellipse(draw, xy, fill, outline=None, width=1):
    draw.ellipse(xy, fill=fill, outline=outline, width=width)


def make_map(name, palette, details):
    w, h = 720, 1280
    img = Image.new("RGBA", (w, h), palette["sky"])
    d = ImageDraw.Draw(img)

    d.rectangle((0, int(h * 0.34), w, h), fill=palette["ground"])
    for y in range(int(h * 0.38), h, 72):
        d.line((0, y, w, y - 64), fill=palette["ground_line"], width=4)

    d.ellipse((-180, 185, 310, 520), fill=palette["hill"])
    d.ellipse((360, 165, 910, 550), fill=palette["hill"])

    path = [(120, 1280), (205, 1040), (270, 840), (340, 660), (390, 520), (430, 420)]
    for i in range(len(path) - 1):
        d.line((path[i], path[i + 1]), fill=palette["road_shadow"], width=96)
        d.line((path[i], path[i + 1]), fill=palette["road"], width=78)

    for x, y, color in details:
        if color == "fence":
            d.rectangle((x, y, x + 18, y + 120), fill="#8b5a2b")
            d.rectangle((x - 42, y + 28, x + 74, y + 42), fill="#a66b34")
            d.rectangle((x - 42, y + 78, x + 74, y + 92), fill="#a66b34")
        elif color == "reed":
            for i in range(5):
                xx = x + i * 13
                d.line((xx, y + 80, xx + 8, y), fill="#466d42", width=5)
                ellipse(d, (xx + 2, y - 18, xx + 18, y + 16), "#a57735")
        elif color == "snow_tree":
            d.rectangle((x + 26, y + 78, x + 44, y + 138), fill="#7a5130")
            d.polygon([(x + 35, y), (x, y + 92), (x + 70, y + 92)], fill="#2f735a")
            d.polygon([(x + 35, y - 18), (x + 8, y + 50), (x + 62, y + 50)], fill="#f4fbff")
        else:
            d.rectangle((x, y, x + 56, y + 46), fill=color)

    for i in range(16):
        x = 36 + (i * 83) % 660
        y = 520 + (i * 127) % 650
        ellipse(d, (x, y, x + 18, y + 10), palette["pebble"])

    rounded(d, (36, 34, 684, 132), 18, palette["panel"], palette["panel_border"], 6)
    d.rectangle((58, 54, 110, 110), fill=palette["badge"])
    d.rectangle((610, 54, 662, 110), fill=palette["badge"])
    return save_png(img, MAP_DIR, name)


def goose_sprite(kind, body, accent, beak="#f2a33c", scale=1.0, boss=False):
    img = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    ox, oy = 8, 12
    shadow = (52, 45, 38, 70)
    ellipse(d, (42, 202, 218, 230), shadow)
    ellipse(d, (48, 96, 198, 202), body, "#2e2e2e", 5)
    ellipse(d, (132, 46, 214, 126), body, "#2e2e2e", 5)
    rounded(d, (114, 72, 158, 148), 20, body, "#2e2e2e", 5)
    d.polygon([(203, 82), (244, 96), (202, 110)], fill=beak, outline="#9c5d17")
    ellipse(d, (174, 70, 188, 84), "#1f2630")
    ellipse(d, (179, 73, 183, 77), "#ffffff")
    if accent == "flower":
        for xy in [(70, 122), (94, 104), (128, 133), (150, 112)]:
            ellipse(d, (xy[0], xy[1], xy[0] + 24, xy[1] + 18), "#d95d75", "#7e2e3c", 2)
    elif accent == "runner":
        d.line((58, 198, 22, 225), fill="#d98c2b", width=8)
        d.line((132, 198, 178, 226), fill="#d98c2b", width=8)
        d.line((28, 224, 6, 224), fill="#d98c2b", width=7)
        d.line((177, 225, 206, 225), fill="#d98c2b", width=7)
        for x in (18, 30, 42):
            d.line((x, 152, x - 32, 152), fill="#e9f2ff", width=4)
    elif accent == "fat":
        ellipse(d, (28, 94, 216, 216), body, "#2e2e2e", 5)
        rounded(d, (78, 116, 170, 150), 14, "#f2d6a2", None)
    elif accent == "gold":
        ellipse(d, (64, 116, 174, 188), "#fff0a4", "#bc8428", 4)
        for x in (42, 205):
            d.polygon([(x, 58), (x + 10, 82), (x + 34, 84), (x + 15, 98), (x + 20, 122), (x, 106), (x - 20, 122), (x - 15, 98), (x - 34, 84), (x - 10, 82)], fill="#ffe066")
    if boss:
        rounded(d, (154, 68, 204, 88), 5, "#151515")
        rounded(d, (104, 68, 150, 88), 5, "#151515")
        d.line((150, 78, 154, 78), fill="#151515", width=4)
        d.polygon([(118, 40), (182, 40), (198, 63), (102, 63)], fill="#b21f2d", outline="#551018")
        d.rectangle((120, 28, 180, 42), fill="#d8b14a")
    return save_png(img, SPRITE_DIR, f"goose_{kind}.png")


def pot_sprite(name, tilt=0, hit=False):
    img = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    ellipse(d, (36, 178, 220, 216), (40, 34, 30, 70))
    ellipse(d, (34, 78, 222, 190), "#3f4448", "#1b1d20", 8)
    ellipse(d, (58, 98, 198, 170), "#22262a", "#7c8790", 6)
    rounded(d, (10, 116, 58, 148), 10, "#30353a", "#151719", 5)
    rounded(d, (198, 116, 246, 148), 10, "#30353a", "#151719", 5)
    ellipse(d, (102, 70, 154, 104), "#5b6268", "#1b1d20", 5)
    if hit:
        for x, y in [(42, 52), (204, 64), (64, 204), (196, 210)]:
            d.line((x - 10, y, x + 10, y), fill="#ffd84d", width=5)
            d.line((x, y - 10, x, y + 10), fill="#ffd84d", width=5)
    if tilt:
        img = img.rotate(tilt, resample=Image.Resampling.NEAREST, expand=False)
    return save_png(img, SPRITE_DIR, name)


def icon(name, kind):
    img = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rounded(d, (8, 8, 120, 120), 20, "#fff1bf", "#7a4c23", 5)
    if kind == "coin":
        ellipse(d, (30, 24, 98, 100), "#f5c84c", "#9b651f", 6)
        d.rectangle((58, 42, 70, 82), fill="#9b651f")
        d.rectangle((44, 56, 84, 68), fill="#9b651f")
    elif kind == "diamond":
        d.polygon([(64, 22), (104, 54), (64, 108), (24, 54)], fill="#58d7ff", outline="#17637c")
        d.line((44, 54, 64, 108, 84, 54), fill="#e5fbff", width=4)
    elif kind == "pot":
        ellipse(d, (26, 48, 102, 92), "#30353a", "#151719", 5)
        ellipse(d, (42, 55, 86, 78), "#7d8790")
    elif kind == "magnet":
        rounded(d, (34, 30, 56, 94), 8, "#d94b4b")
        rounded(d, (72, 30, 94, 94), 8, "#4b7ed9")
        d.arc((34, 24, 94, 86), 0, 180, fill="#3c4044", width=16)
    elif kind == "fire":
        d.polygon([(64, 104), (38, 76), (56, 54), (62, 20), (82, 56), (94, 78)], fill="#e94d2f")
        d.polygon([(64, 100), (52, 76), (66, 58), (78, 80)], fill="#ffd34e")
    elif kind == "lightning":
        d.polygon([(76, 18), (38, 68), (62, 68), (52, 110), (94, 54), (68, 56)], fill="#ffe45c", outline="#9a7821")
    elif kind == "timer":
        ellipse(d, (30, 34, 98, 102), "#dff2ff", "#26465a", 6)
        d.rectangle((54, 18, 74, 34), fill="#26465a")
        d.line((64, 68, 64, 44), fill="#26465a", width=6)
        d.line((64, 68, 82, 78), fill="#26465a", width=5)
    elif kind == "combo":
        d.line((30, 88, 98, 36), fill="#d94b4b", width=12)
        d.line((30, 36, 98, 88), fill="#d94b4b", width=12)
        ellipse(d, (24, 72, 48, 96), "#ffd84d")
        ellipse(d, (80, 28, 104, 52), "#ffd84d")
    return save_png(img, ICON_DIR, name)


def clamp(v):
    return max(-1.0, min(1.0, v))


def env(t, dur, a=0.01, d=0.04, s=0.65, r=0.08):
    if t < a:
        return t / a
    if t < a + d:
        return 1 + (s - 1) * ((t - a) / d)
    if t > dur - r:
        return max(0, s * ((dur - t) / r))
    return s


def sine(freq, t):
    return math.sin(2 * math.pi * freq * t)


def square(freq, t, duty=0.5):
    return 1.0 if (freq * t) % 1.0 < duty else -1.0


def tri(freq, t):
    return 4 * abs((freq * t) % 1.0 - 0.5) - 1


def render(dur, fn):
    return [fn(i / SAMPLE_RATE) for i in range(int(dur * SAMPLE_RATE))]


def silence(dur):
    return [0.0] * int(dur * SAMPLE_RATE)


def write_wav(name, samples):
    peak = max(0.001, max(abs(v) for v in samples))
    gain = min(0.95 / peak, 1.0)
    pcm = array("h", (int(clamp(v * gain) * 32767) for v in samples))
    path = os.path.join(AUDIO_DIR, name)
    with wave.open(path, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(pcm.tobytes())
    return rel(path)


def concat(parts):
    out = []
    for part in parts:
        out.extend(part)
    return out


def goose_honk(panic=False, boss=False):
    dur = 0.42 if panic else 0.32
    base = 230 if boss else 430
    if panic:
        base = 560

    def sample(t):
        u = t / dur
        wobble = 1 + 0.18 * sine(13, t)
        pitch = base * (1.08 - 0.22 * u) * wobble
        nasal = square(pitch, t, 0.36) * 0.24 + sine(pitch * 1.8, t) * 0.12
        return nasal * env(t, dur, 0.015, 0.05, 0.75, 0.12)

    return render(dur, sample)


def pot_throw():
    random.seed(12)
    dur = 0.46

    def sample(t):
        u = t / dur
        noise = (random.random() * 2 - 1) * (1 - u)
        return (sine(980 - 680 * u, t) * 0.22 + noise * 0.16) * env(t, dur, 0.01, 0.08, 0.55, 0.18)

    return render(dur, sample)


def pot_hit():
    random.seed(18)
    thud = render(0.18, lambda t: (sine(120 - 40 * t, t) * 0.55 + (random.random() * 2 - 1) * 0.1) * env(t, 0.18, 0.002, 0.03, 0.35, 0.08))
    sparkle = concat([render(0.08, lambda t, f=f: square(f, t) * env(t, 0.08, 0.004, 0.02, 0.6, 0.03) * 0.16) for f in (660, 880, 1174)])
    return concat([thud, sparkle])


def pot_miss():
    return render(0.34, lambda t: square(360 - 170 * (t / 0.34), t, 0.45) * env(t, 0.34, 0.01, 0.05, 0.55, 0.12) * 0.18)


def coin_burst():
    return concat([render(0.07, lambda t, f=f: square(f, t) * env(t, 0.07, 0.002, 0.02, 0.5, 0.03) * 0.13) + silence(0.015) for f in (880, 1174, 1568, 1760)])


def bgm_loop():
    bpm = 126
    beat = 60 / bpm
    beats = 32
    dur = beats * beat
    samples = [0.0] * int(dur * SAMPLE_RATE)
    lead = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880.0, 698.46]
    bass = [130.81, 146.83, 174.61, 196.0]
    random.seed(36)

    def add(start, length, freq, vol, fn):
        a = int(start * SAMPLE_RATE)
        b = min(len(samples), a + int(length * SAMPLE_RATE))
        for i in range(a, b):
            t = (i - a) / SAMPLE_RATE
            samples[i] += fn(freq, t) * env(t, length, 0.004, 0.04, 0.45, 0.05) * vol

    for i in range(beats):
        t = i * beat
        add(t, beat * 0.38, lead[i % len(lead)], 0.09, square)
        add(t + beat * 0.5, beat * 0.28, lead[(i + 2) % len(lead)] * 1.5, 0.055, tri)
        if i % 2 == 0:
            add(t, beat * 0.8, bass[(i // 2) % len(bass)], 0.14, tri)
        hat_start = int((t + beat * 0.75) * SAMPLE_RATE)
        for j in range(hat_start, min(len(samples), hat_start + int(0.035 * SAMPLE_RATE))):
            local = (j - hat_start) / SAMPLE_RATE
            samples[j] += (random.random() * 2 - 1) * env(local, 0.035, 0.001, 0.006, 0.2, 0.02) * 0.035

    fade = int(0.018 * SAMPLE_RATE)
    for i in range(fade):
        samples[i] *= i / fade
        samples[-1 - i] *= i / fade
    return samples


def main():
    ensure_dirs()
    generated = {"maps": [], "sprites": [], "icons": [], "audio": []}

    generated["maps"].append(make_map("map_farm.png", {
        "sky": "#9fd7ff", "ground": "#80bd58", "ground_line": "#6ea94a", "hill": "#69a94e",
        "road": "#d89f5b", "road_shadow": "#b77b40", "panel": "#fff1bf",
        "panel_border": "#7a4c23", "badge": "#e15b3c", "pebble": "#5f8b4b",
    }, [(70, 520, "fence"), (565, 690, "fence"), (110, 860, "#d9b45f"), (535, 1010, "#d9b45f")]))
    generated["maps"].append(make_map("map_wetland.png", {
        "sky": "#a6e7f4", "ground": "#69a878", "ground_line": "#4f8d62", "hill": "#5d9f70",
        "road": "#c89d60", "road_shadow": "#967446", "panel": "#e5f5d5",
        "panel_border": "#3c6b42", "badge": "#4f9fc8", "pebble": "#3d7657",
    }, [(62, 530, "reed"), (560, 620, "reed"), (82, 850, "reed"), (525, 1010, "reed")]))
    generated["maps"].append(make_map("map_snowfield.png", {
        "sky": "#c7ecff", "ground": "#edf8ff", "ground_line": "#d2e8f5", "hill": "#d7f0fa",
        "road": "#d8e7ef", "road_shadow": "#aac3cf", "panel": "#fff5d2",
        "panel_border": "#57758a", "badge": "#df4c4c", "pebble": "#b1cad6",
    }, [(88, 520, "snow_tree"), (550, 660, "snow_tree"), (98, 900, "snow_tree"), (528, 1040, "snow_tree")]))

    generated["sprites"].extend([
        goose_sprite("white", "#f8fbff", None),
        goose_sprite("flower", "#f7f0df", "flower"),
        goose_sprite("runner", "#f3f8ff", "runner"),
        goose_sprite("fat", "#fff5dd", "fat"),
        goose_sprite("gold", "#ffd85d", "gold"),
        goose_sprite("boss", "#f5f1e8", None, boss=True),
        pot_sprite("pot_rest.png"),
        pot_sprite("pot_flying.png", -22),
        pot_sprite("pot_hit.png", hit=True),
    ])

    for file_name, kind in [
        ("icon_coin.png", "coin"),
        ("icon_diamond.png", "diamond"),
        ("icon_pot.png", "pot"),
        ("icon_skill_magnet.png", "magnet"),
        ("icon_skill_fire.png", "fire"),
        ("icon_skill_lightning.png", "lightning"),
        ("icon_timer.png", "timer"),
        ("icon_combo.png", "combo"),
    ]:
        generated["icons"].append(icon(file_name, kind))

    generated["audio"].extend([
        write_wav("bgm_electro_loop.wav", bgm_loop()),
        write_wav("goose_honk.wav", goose_honk()),
        write_wav("goose_panic.wav", goose_honk(panic=True)),
        write_wav("boss_honk.wav", goose_honk(boss=True)),
        write_wav("pot_throw.wav", pot_throw()),
        write_wav("pot_hit.wav", pot_hit()),
        write_wav("pot_miss.wav", pot_miss()),
        write_wav("coin_burst.wav", coin_burst()),
    ])

    manifest = {
        "name": "iron_goose_core_assets",
        "game": "铁锅套大鹅",
        "generatedBy": "scripts/generate_iron_goose_assets.py",
        "notes": "Prototype runtime-ready PNG/WAV assets. PNG sprites and icons use transparent backgrounds.",
        "assets": generated,
    }
    manifest_path = os.path.join(OUT_DIR, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    readme_path = os.path.join(OUT_DIR, "README.md")
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write("# 铁锅套大鹅核心素材\n\n")
        f.write("这些素材由 `scripts/generate_iron_goose_assets.py` 本地生成，供后续接入游戏运行时使用。\n\n")
        f.write("- `maps/`: 关卡地图背景。\n")
        f.write("- `sprites/`: 大鹅与铁锅透明 PNG。\n")
        f.write("- `icons/`: 金币、钻石、锅技、计时、连击图标。\n")
        f.write("- `audio/`: 循环电子 BGM、大鹅叫声、投锅、套中、未命中、金币音效。\n")

    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
