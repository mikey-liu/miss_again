import math
import os
import random
import wave
from array import array


SAMPLE_RATE = 22050
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "assets", "audio")


def clamp(value, low=-1.0, high=1.0):
    return max(low, min(high, value))


def envelope(t, duration, attack=0.01, decay=0.04, sustain=0.72, release=0.08):
    if duration <= 0:
        return 0.0
    if t < attack:
        return t / attack
    if t < attack + decay:
        u = (t - attack) / decay
        return 1.0 + (sustain - 1.0) * u
    if t > duration - release:
        u = (duration - t) / release
        return max(0.0, sustain * u)
    return sustain


def square(freq, t, duty=0.5):
    phase = (freq * t) % 1.0
    return 1.0 if phase < duty else -1.0


def triangle(freq, t):
    phase = (freq * t) % 1.0
    return 4.0 * abs(phase - 0.5) - 1.0


def sine(freq, t):
    return math.sin(2.0 * math.pi * freq * t)


def write_wav(name, samples):
    os.makedirs(OUT_DIR, exist_ok=True)
    peak = max(0.001, max(abs(v) for v in samples))
    scale = min(0.96 / peak, 1.0)
    pcm = array("h", (int(clamp(v * scale) * 32767) for v in samples))
    path = os.path.join(OUT_DIR, name)
    with wave.open(path, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(pcm.tobytes())
    return path


def render(duration, fn):
    total = int(duration * SAMPLE_RATE)
    return [fn(i / SAMPLE_RATE) for i in range(total)]


def tone(freq, duration, wave_fn=square, volume=0.4):
    return render(
        duration,
        lambda t: wave_fn(freq, t) * envelope(t, duration) * volume,
    )


def concat(parts):
    samples = []
    for part in parts:
        samples.extend(part)
    return samples


def silence(duration):
    return [0.0] * int(duration * SAMPLE_RATE)


def make_click():
    return concat([
        tone(880, 0.055, square, 0.18),
        silence(0.025),
        tone(1320, 0.05, square, 0.14),
    ])


def make_throw_whoosh():
    random.seed(101)

    def sample(t):
        duration = 0.42
        u = t / duration
        freq = 980 - 650 * u
        noise = (random.random() * 2.0 - 1.0) * (1.0 - u)
        body = sine(freq, t) * 0.35 + noise * 0.18
        return body * envelope(t, duration, 0.02, 0.08, 0.65, 0.16)

    return render(0.42, sample)


def make_ground_thud():
    random.seed(202)

    def sample(t):
        duration = 0.22
        u = t / duration
        freq = 170 - 95 * u
        noise = (random.random() * 2.0 - 1.0) * max(0.0, 1.0 - u * 2.0)
        return (sine(freq, t) * 0.52 + noise * 0.18) * envelope(t, duration, 0.002, 0.04, 0.36, 0.12)

    return render(0.22, sample)


def make_veggie_bounce():
    def sample(t):
        duration = 0.34
        u = t / duration
        freq = 280 + 420 * math.sin(math.pi * u)
        return (square(freq, t, 0.42) * 0.26 + triangle(freq * 0.5, t) * 0.18) * envelope(t, duration, 0.006, 0.04, 0.66, 0.11)

    return render(0.34, sample)


def make_hit_success():
    notes = [523.25, 659.25, 783.99, 1046.5]
    parts = []
    for freq in notes:
        parts.append(tone(freq, 0.115, square, 0.24))
        parts.append(tone(freq * 2.0, 0.115, triangle, 0.06))
    return concat(parts)


def make_miss_blip():
    def sample(t):
        duration = 0.33
        u = t / duration
        freq = 440 - 210 * u
        wobble = 1.0 + 0.06 * sine(8.0, t)
        return square(freq * wobble, t, 0.46) * envelope(t, duration, 0.01, 0.05, 0.55, 0.12) * 0.2

    return render(0.33, sample)


def make_result_jingle():
    melody = [523.25, 659.25, 783.99, 987.77, 1046.5]
    parts = []
    for i, freq in enumerate(melody):
        dur = 0.14 if i < len(melody) - 1 else 0.32
        parts.append(tone(freq, dur, square, 0.22))
        parts.append(tone(freq * 0.5, dur, triangle, 0.08))
        if i < len(melody) - 1:
            parts.append(silence(0.018))
    return concat(parts)


def make_bgm_loop():
    random.seed(303)
    bpm = 120
    beat = 60.0 / bpm
    bars = 8
    beats = bars * 4
    duration = beats * beat
    samples = [0.0] * int(duration * SAMPLE_RATE)

    lead_notes = [
        523.25, 659.25, 783.99, 659.25,
        587.33, 698.46, 880.00, 698.46,
        523.25, 659.25, 783.99, 987.77,
        880.00, 783.99, 659.25, 587.33,
    ]
    bass_notes = [130.81, 146.83, 174.61, 196.00]

    def add_note(start, dur, freq, volume, wave_fn):
        start_i = int(start * SAMPLE_RATE)
        end_i = min(len(samples), start_i + int(dur * SAMPLE_RATE))
        for i in range(start_i, end_i):
            t = (i - start_i) / SAMPLE_RATE
            samples[i] += wave_fn(freq, t) * envelope(t, dur, 0.01, 0.05, 0.55, 0.06) * volume

    for beat_index in range(beats):
        t = beat_index * beat
        lead = lead_notes[beat_index % len(lead_notes)]
        add_note(t, beat * 0.44, lead, 0.12, square)
        add_note(t + beat * 0.5, beat * 0.34, lead * 1.5, 0.075, triangle)

        if beat_index % 2 == 0:
            bass = bass_notes[(beat_index // 2) % len(bass_notes)]
            add_note(t, beat * 0.82, bass, 0.16, triangle)

        hat_start = int((t + beat * 0.72) * SAMPLE_RATE)
        hat_end = min(len(samples), hat_start + int(0.035 * SAMPLE_RATE))
        for i in range(hat_start, hat_end):
            local = (i - hat_start) / SAMPLE_RATE
            samples[i] += (random.random() * 2.0 - 1.0) * envelope(local, 0.035, 0.001, 0.006, 0.18, 0.025) * 0.035

    # Tiny fade prevents clicks while keeping the loop feel.
    fade = int(0.018 * SAMPLE_RATE)
    for i in range(fade):
        samples[i] *= i / fade
        samples[-1 - i] *= i / fade

    return samples


def main():
    generated = [
        write_wav("ui_click.wav", make_click()),
        write_wav("throw_whoosh.wav", make_throw_whoosh()),
        write_wav("ground_thud.wav", make_ground_thud()),
        write_wav("veggie_bounce.wav", make_veggie_bounce()),
        write_wav("hit_success.wav", make_hit_success()),
        write_wav("miss_blip.wav", make_miss_blip()),
        write_wav("result_jingle.wav", make_result_jingle()),
        write_wav("bgm_loop.wav", make_bgm_loop()),
    ]
    for path in generated:
        print(path)


if __name__ == "__main__":
    main()
