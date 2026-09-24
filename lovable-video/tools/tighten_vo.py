#!/usr/bin/env python3
"""Shorten long pauses in the voiceover (the words themselves are untouched).

Pauses longer than 1.2 s become 0.65 s, pauses of 0.55-1.2 s become 0.45 s.
Cuts land in the middle of each silence with short fades, so no word is clipped.

Usage: python3 tools/tighten_vo.py media/voiceover_raw.wav media/voiceover.wav
"""
import sys, wave, json
import numpy as np

src, dst = sys.argv[1:3]
with wave.open(src) as w:
    sr, sw, ch = w.getframerate(), w.getsampwidth(), w.getnchannels()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)
if ch > 1:
    x = x.reshape(-1, ch).mean(axis=1)

hop = int(sr * 0.01)
n = len(x) // hop
db = 20 * np.log10(np.sqrt(np.mean((x[: n * hop] / 32768).reshape(n, hop) ** 2, axis=1)) + 1e-9)
silent = db < np.percentile(db, 90) - 30

runs, i = [], 0
while i < n:
    if silent[i]:
        j = i
        while j < n and silent[j]: j += 1
        runs.append((i * hop, j * hop)); i = j
    else: i += 1

keep_lead, keep_tail = int(0.25 * sr), int(0.6 * sr)
segs = []  # (start, end) sample ranges to keep
cur = 0
if runs and runs[0][0] == 0:
    cur = max(0, runs[0][1] - keep_lead); runs = runs[1:]
end_total = len(x)
if runs and runs[-1][1] >= n * hop - hop:
    end_total = min(len(x), runs[-1][0] + keep_tail); runs = runs[:-1]
removed = []
for a, b in runs:
    d = (b - a) / sr
    target = 0.65 if d > 1.2 else 0.45 if d > 0.55 else None
    if target is None: continue
    cut = int((d - target) * sr)
    mid = (a + b) // 2
    ca, cb = mid - cut // 2, mid - cut // 2 + cut
    segs.append((cur, ca)); cur = cb
    removed.append([round(ca / sr, 3), round(cb / sr, 3)])
segs.append((cur, end_total))

fade = int(0.02 * sr)
parts = []
for a, b in segs:
    s = x[a:b].copy()
    if len(s) > 2 * fade:
        s[:fade] *= np.linspace(0, 1, fade); s[-fade:] *= np.linspace(1, 0, fade)
    parts.append(s)
y = np.concatenate(parts)
with wave.open(dst, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes(np.clip(y, -32768, 32767).astype(np.int16).tobytes())
print(f"{len(x)/sr:.2f}s -> {len(y)/sr:.2f}s, {len(removed)} pauses shortened")
json.dump({'removed': removed, 'in': len(x) / sr, 'out': len(y) / sr}, open(dst + '.edits.json', 'w'))
