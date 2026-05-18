"""
Salem 1692 -- Thematic Sound Effects Generator

Generates 9 WAV files with dark colonial / suspense atmosphere.
44100Hz 16-bit mono. Uses numpy for synthesis.
"""

import numpy as np
import struct
import os

SR = 44100
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "packages", "client", "public", "assets", "sounds")


def write_wav(path: str, samples: np.ndarray):
    samples = np.clip(samples, -1.0, 1.0)
    int_samples = (samples * 32767).astype(np.int16)
    n = len(int_samples)
    with open(path, "wb") as f:
        f.write(b"RIFF")
        f.write(struct.pack("<I", 36 + n * 2))
        f.write(b"WAVE")
        f.write(b"fmt ")
        f.write(struct.pack("<IHHIIHH", 16, 1, 1, SR, SR * 2, 2, 16))
        f.write(b"data")
        f.write(struct.pack("<I", n * 2))
        f.write(int_samples.tobytes())


def envelope(length: int, attack: float, decay: float, sustain: float, release: float, sustain_level: float = 0.7) -> np.ndarray:
    a = int(attack * SR)
    d = int(decay * SR)
    r = int(release * SR)
    s = max(0, length - a - d - r)
    env = np.concatenate([
        np.linspace(0, 1, a) if a > 0 else np.array([]),
        np.linspace(1, sustain_level, d) if d > 0 else np.array([]),
        np.full(s, sustain_level),
        np.linspace(sustain_level, 0, r) if r > 0 else np.array([]),
    ])
    return env[:length] if len(env) >= length else np.pad(env, (0, length - len(env)))


def reverb(signal: np.ndarray, decay_time: float = 0.3, wet: float = 0.3) -> np.ndarray:
    ir_len = int(decay_time * SR)
    ir = np.random.randn(ir_len) * np.exp(-np.linspace(0, 8, ir_len))
    ir[0] = 1.0
    ir /= np.sqrt(np.sum(ir ** 2))
    convolved = np.convolve(signal, ir)[:len(signal)]
    return signal * (1 - wet) + convolved * wet


def lowpass(signal: np.ndarray, cutoff: float) -> np.ndarray:
    rc = 1.0 / (2.0 * np.pi * cutoff)
    dt = 1.0 / SR
    alpha = dt / (rc + dt)
    out = np.zeros_like(signal)
    out[0] = signal[0]
    for i in range(1, len(signal)):
        out[i] = out[i - 1] + alpha * (signal[i] - out[i - 1])
    return out


def highpass(signal: np.ndarray, cutoff: float) -> np.ndarray:
    return signal - lowpass(signal, cutoff)


def gen_card_flip() -> np.ndarray:
    """Parchment flip -- filtered noise burst with quick decay."""
    dur = 0.25
    n = int(dur * SR)
    noise = np.random.randn(n) * 0.6
    env = envelope(n, 0.002, 0.03, 0, 0.15, 0.3)
    sig = noise * env
    sig = lowpass(sig, 4000)
    sig = highpass(sig, 800)
    click = np.zeros(n)
    click_len = int(0.003 * SR)
    t_click = np.linspace(0, 0.003, click_len)
    click[:click_len] = np.sin(2 * np.pi * 2200 * t_click) * np.exp(-t_click * 1500) * 0.4
    sig += click
    return reverb(sig, 0.08, 0.15) * 0.7


def gen_card_play() -> np.ndarray:
    """Card slap on wooden table -- impact + wood resonance."""
    dur = 0.35
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    impact = np.random.randn(n) * np.exp(-t * 40) * 0.5
    impact = lowpass(impact, 2000)
    wood1 = np.sin(2 * np.pi * 180 * t) * np.exp(-t * 20) * 0.4
    wood2 = np.sin(2 * np.pi * 320 * t) * np.exp(-t * 25) * 0.2
    wood3 = np.sin(2 * np.pi * 540 * t) * np.exp(-t * 35) * 0.1
    sig = impact + wood1 + wood2 + wood3
    return reverb(sig, 0.12, 0.2) * 0.75


def gen_card_draw() -> np.ndarray:
    """Paper slide -- bandpass noise sweep."""
    dur = 0.30
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    noise = np.random.randn(n) * 0.4
    env = envelope(n, 0.02, 0.05, 0, 0.18, 0.5)
    sig = noise * env
    sig = lowpass(sig, 3500)
    sig = highpass(sig, 1200)
    slide = np.sin(2 * np.pi * (1800 + 600 * t / dur) * t) * np.exp(-t * 12) * 0.15
    sig += slide
    return reverb(sig, 0.06, 0.1) * 0.65


def gen_night_begin() -> np.ndarray:
    """Dark ominous atmosphere -- low drone + wind noise + distant owl. Extended to 4s."""
    dur = 4.0
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    env = envelope(n, 0.5, 0.3, 0, 1.0, 0.8)
    drone1 = np.sin(2 * np.pi * 55 * t) * 0.25
    drone2 = np.sin(2 * np.pi * 82.5 * t + 0.3) * 0.15
    drone3 = np.sin(2 * np.pi * 110 * t + 0.7) * 0.08
    sub = np.sin(2 * np.pi * 36 * t) * 0.12
    swell = np.sin(2 * np.pi * 73 * t) * 0.1 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.25 * t))
    drone = (drone1 + drone2 + drone3 + sub + swell) * env
    wind = np.random.randn(n) * 0.08
    wind = lowpass(wind, 600)
    wind_env = 0.5 + 0.5 * np.sin(2 * np.pi * 0.5 * t)
    wind *= wind_env * env
    owl_start = int(1.2 * SR)
    owl_dur = int(0.4 * SR)
    owl = np.zeros(n)
    owl_t = np.linspace(0, 0.4, owl_dur)
    owl_sig = np.sin(2 * np.pi * (600 + 200 * np.sin(2 * np.pi * 3 * owl_t)) * owl_t) * 0.06
    owl_sig *= np.exp(-owl_t * 4) * np.sin(np.pi * owl_t / 0.4)
    owl[owl_start:owl_start + owl_dur] = owl_sig
    owl2_start = int(2.8 * SR)
    owl2 = np.zeros(n)
    owl2_t = np.linspace(0, 0.3, int(0.3 * SR))
    owl2_sig = np.sin(2 * np.pi * (550 + 150 * np.sin(2 * np.pi * 4 * owl2_t)) * owl2_t) * 0.04
    owl2_sig *= np.exp(-owl2_t * 5) * np.sin(np.pi * owl2_t / 0.3)
    owl2[owl2_start:owl2_start + int(0.3 * SR)] = owl2_sig
    sig = drone + wind + owl + owl2
    return reverb(sig, 0.8, 0.45) * 0.8


def gen_witch_kill() -> np.ndarray:
    """Dark impact for successful witch kill -- noise burst + low body + reverse reverb feel."""
    dur = 0.5
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    impact = np.random.randn(n) * np.exp(-t * 25) * 0.5
    impact = lowpass(impact, 1500)
    body = np.sin(2 * np.pi * 80 * t) * np.exp(-t * 8) * 0.4
    body2 = np.sin(2 * np.pi * 120 * t) * np.exp(-t * 12) * 0.2
    scrape = np.random.randn(n) * 0.15
    scrape = lowpass(scrape, 800)
    scrape = highpass(scrape, 200)
    scrape_env = np.exp(-t * 10) * (1 - np.exp(-t * 50))
    scrape *= scrape_env
    sig = impact + body + body2 + scrape
    return reverb(sig, 0.25, 0.35) * 0.85


def gen_dawn() -> np.ndarray:
    """Church bell at dawn -- Risset-style bell synthesis + reverb."""
    dur = 1.5
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    f0 = 440
    partials = [
        (0.56, 1.0, 2.0), (0.92, 0.7, 2.5), (1.19, 0.5, 3.0),
        (1.71, 0.3, 3.5), (2.0, 0.25, 4.0), (2.74, 0.15, 5.0),
        (3.0, 0.12, 5.5), (3.76, 0.08, 6.0),
    ]
    sig = np.zeros(n)
    for ratio, amp, decay in partials:
        sig += np.sin(2 * np.pi * f0 * ratio * t) * amp * np.exp(-t * decay)
    env = envelope(n, 0.005, 0.05, 0, 0.8, 0.6)
    sig *= env * 0.35
    sig = reverb(sig, 0.5, 0.45)
    warmth = np.sin(2 * np.pi * 220 * t) * np.exp(-t * 6) * 0.08
    sig += warmth
    return sig * 0.75


def gen_gavel() -> np.ndarray:
    """Wooden gavel strike -- sharp transient + wood body resonance."""
    dur = 0.4
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    impact_noise = np.random.randn(n) * np.exp(-t * 80) * 0.6
    impact_noise = lowpass(impact_noise, 3000)
    body1 = np.sin(2 * np.pi * 220 * t) * np.exp(-t * 15) * 0.5
    body2 = np.sin(2 * np.pi * 440 * t) * np.exp(-t * 20) * 0.25
    body3 = np.sin(2 * np.pi * 660 * t) * np.exp(-t * 30) * 0.12
    click = np.sin(2 * np.pi * 3500 * t) * np.exp(-t * 200) * 0.3
    sig = impact_noise + body1 + body2 + body3 + click
    return reverb(sig, 0.15, 0.25) * 0.85


def gen_death() -> np.ndarray:
    """Funeral bell toll -- deep single bell + long reverb tail."""
    dur = 1.5
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    f0 = 165
    partials = [
        (0.56, 1.0, 1.5), (0.92, 0.8, 2.0), (1.19, 0.6, 2.5),
        (1.71, 0.4, 3.0), (2.0, 0.3, 3.5), (2.74, 0.2, 4.0),
        (3.0, 0.15, 4.5), (4.07, 0.08, 5.5),
    ]
    sig = np.zeros(n)
    for ratio, amp, decay in partials:
        sig += np.sin(2 * np.pi * f0 * ratio * t) * amp * np.exp(-t * decay)
    env = envelope(n, 0.003, 0.05, 0, 0.6, 0.7)
    sig *= env * 0.4
    sub = np.sin(2 * np.pi * 55 * t) * np.exp(-t * 3) * 0.12
    sig += sub
    return reverb(sig, 0.8, 0.5) * 0.85


def gen_tick() -> np.ndarray:
    """Pendulum clock tick -- metallic click with micro-resonance."""
    dur = 0.08
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    click = np.sin(2 * np.pi * 4000 * t) * np.exp(-t * 120) * 0.5
    body = np.sin(2 * np.pi * 1200 * t) * np.exp(-t * 60) * 0.3
    mech = np.random.randn(n) * np.exp(-t * 150) * 0.15
    mech = lowpass(mech, 5000)
    sig = click + body + mech
    return reverb(sig, 0.04, 0.1) * 0.6


def gen_victory() -> np.ndarray:
    """Solemn organ chord -- stacked harmonics with slow swell."""
    dur = 2.5
    n = int(dur * SR)
    t = np.linspace(0, dur, n)
    env = envelope(n, 0.5, 0.3, 0, 0.8, 0.75)
    chord_freqs = [130.81, 164.81, 196.0, 261.63, 329.63]
    sig = np.zeros(n)
    for f in chord_freqs:
        for h in range(1, 6):
            amp = 0.3 / (h * 1.2)
            phase = np.random.random() * 2 * np.pi
            sig += np.sin(2 * np.pi * f * h * t + phase) * amp
    sig *= env
    sig = lowpass(sig, 4000)
    octave_up = np.zeros(n)
    for f in [523.25, 659.26]:
        octave_up += np.sin(2 * np.pi * f * t) * 0.08
    oct_env = envelope(n, 0.8, 0.2, 0, 0.6, 0.5)
    sig += octave_up * oct_env
    sig = reverb(sig, 0.8, 0.4)
    peak = np.max(np.abs(sig))
    if peak > 0:
        sig /= peak
    return sig * 0.8


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    sounds = {
        "card-flip.wav": gen_card_flip,
        "card-play.wav": gen_card_play,
        "card-draw.wav": gen_card_draw,
        "night-begin.wav": gen_night_begin,
        "witch-kill.wav": gen_witch_kill,
        "dawn.wav": gen_dawn,
        "gavel.wav": gen_gavel,
        "death.wav": gen_death,
        "tick.wav": gen_tick,
        "victory.wav": gen_victory,
    }

    for filename, generator in sounds.items():
        path = os.path.join(OUTPUT_DIR, filename)
        samples = generator()
        write_wav(path, samples)
        dur = len(samples) / SR
        print(f"  {filename:20s} {dur:.2f}s  {len(samples)} samples")

    print(f"\nAll 10 sounds generated in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
