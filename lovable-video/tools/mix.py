#!/usr/bin/env python3
"""Final audio: voiceover (forward) + a soft original music bed (synthesized here) + restrained SFX.

Usage: python3 tools/mix.py cues.json media/voiceover.wav out/mix.wav <total_seconds>
cues.json: [[time, type, gain], ...] with type in pop | card | whoosh | tick
"""
import json, sys, wave
import numpy as np

cues_path, vo_path, out_path, total = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
SR = 48000
N = int(total * SR)
rng = np.random.default_rng(7)

def db(x): return 10 ** (x / 20)

# ---------------- voiceover ----------------
with wave.open(vo_path) as w:
    vsr = w.getframerate(); ch = w.getnchannels()
    v = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
if ch > 1: v = v.reshape(-1, ch).mean(axis=1)
tt = np.arange(int(len(v) / vsr * SR)) / SR
v = np.interp(tt, np.arange(len(v)) / vsr, v).astype(np.float32)
v *= db(-3) / (np.percentile(np.abs(v), 99.9) + 1e-9)   # peaks around -3 dBFS
vo = np.zeros(N, np.float32); vo[: min(N, len(v))] = v[:N]

# voice activity envelope (for ducking)
hop = SR // 100
env = np.sqrt(np.convolve(vo ** 2, np.ones(hop) / hop, mode='same'))
active = (env > db(-40)).astype(np.float32)
k = np.ones(int(0.25 * SR)) / int(0.25 * SR)
active = np.clip(np.convolve(active, k, mode='same') * 2, 0, 1)

# ---------------- music (original, synthesized) ----------------
bpm = 84; beat = 60 / bpm; bar = 4 * beat
def midi(m): return 440 * 2 ** ((m - 69) / 12)
chords = [  # F major: Fmaj7, Dm7, Bbmaj7, C6
    [53, 57, 60, 64], [50, 53, 57, 60], [46, 50, 53, 57], [48, 52, 55, 57]]
music = np.zeros(N, np.float32)
t_all = np.arange(N) / SR

def add_tone(start, dur, f, gain, attack=0.01, decay=None, harm=(1.0, 0.25, 0.08)):
    a = int(start * SR); b = min(N, int((start + dur) * SR))
    if a >= N or b <= a: return
    t = np.arange(b - a) / SR
    sig = sum(h * np.sin(2 * np.pi * f * (i + 1) * t) for i, h in enumerate(harm))
    e = np.minimum(1, t / attack)
    e *= np.exp(-t / decay) if decay else np.minimum(1, (dur - t) / 0.6).clip(0, 1)
    music[a:b] += (gain * sig * e).astype(np.float32)

t = 0.0; ci = 0
while t < total:
    ch_ = chords[ci % 4]
    for n_ in ch_:                                   # warm pad, 2 bars
        add_tone(t, 2 * bar + 0.4, midi(n_), 0.035, attack=0.9, harm=(1.0, 0.12, 0.03))
    for b_ in range(2):                              # soft bass on 1 and 3
        for q in (0, 2):
            add_tone(t + b_ * bar + q * beat, beat * 1.6, midi(ch_[0] - 12), 0.10, attack=0.02, decay=0.7, harm=(1.0, 0.3))
    pattern = [0, 2, 1, 3, 2, 1, 3, 2]               # gentle e-piano notes on the beat
    for i, p in enumerate(pattern):
        if (i + ci) % 3 == 2: continue               # leave space
        add_tone(t + i * beat, beat * 2.5, midi(ch_[p] + 12), 0.05, attack=0.005, decay=0.55, harm=(1.0, 0.35, 0.1, 0.05))
    t += 2 * bar; ci += 1

# gentle low-pass for warmth
alpha = 0.18
def onepole(x, a):
    out = np.empty_like(x); s = 0.0
    for i in range(0, len(x), 4096):
        seg = x[i:i + 4096]
        o = np.empty_like(seg)
        for j, val in enumerate(seg):
            s += a * (val - s); o[j] = s
        out[i:i + 4096] = o
    return out
music = onepole(music, alpha)
music *= db(-20) / (np.percentile(np.abs(music), 99.5) + 1e-9)
duck = 1 - 0.55 * active                              # music dips under speech
fade = np.clip(np.minimum(t_all / 1.2, (total - t_all) / 2.0), 0, 1)
music *= duck * fade

# ---------------- SFX (synthesized, restrained) ----------------
sfx = np.zeros(N, np.float32)
def place(sig, at, gain):
    a = int(at * SR)
    if a < 0 or a >= N: return
    b = min(N, a + len(sig)); sfx[a:b] += gain * sig[: b - a]
def s_pop():
    d = 0.09; tt_ = np.arange(int(d * SR)) / SR
    f = 520 + 520 * (tt_ / d)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt_ / 0.03)).astype(np.float32)
def s_tick():
    d = 0.06; tt_ = np.arange(int(d * SR)) / SR
    return (np.sin(2 * np.pi * 1400 * tt_) * np.exp(-tt_ / 0.012) * 0.8).astype(np.float32)
def s_noise(d, lo_a, hi_env):
    n = rng.standard_normal(int(d * SR)).astype(np.float32)
    n = onepole(n, lo_a)
    tt_ = np.arange(len(n)) / SR
    return n * hi_env(tt_, d)
def s_card():
    s = s_noise(0.16, 0.25, lambda t_, d: np.sin(np.pi * t_ / d) ** 2)
    return s / (np.abs(s).max() + 1e-9)
def s_whoosh():
    s = s_noise(0.42, 0.08, lambda t_, d: np.sin(np.pi * t_ / d) ** 3)
    return s / (np.abs(s).max() + 1e-9)
bank = {'pop': (s_pop(), db(-24)), 'tick': (s_tick(), db(-28)), 'card': (s_card(), db(-30)), 'whoosh': (s_whoosh(), db(-33))}
for at, typ, g in json.load(open(cues_path)):
    sig, base = bank[typ]
    place(sig, at, base * g)

mix = vo + music + sfx
peak = np.abs(mix).max()
if peak > db(-1): mix *= db(-1) / peak
out = np.stack([mix, mix], axis=1)
with wave.open(out_path, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
print(f'mixed {total:.2f}s -> {out_path}')
