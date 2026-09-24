#!/usr/bin/env python3
"""Word timings from the audio itself: speech recognition + matching to the known script.

1. pocketsphinx (bundled en-us model, runs offline) recognises the voiceover, giving
   words with start/end times.
2. The recognised words are matched to script.txt (difflib). Matched script words take
   the recognised times; misheard stretches of the same length take them one-to-one;
   otherwise the stretch's time is shared out by word length.
3. Writes src/timing.js (window.KDP_TIMING) used for captions and animation beats.

Usage: python3 tools/asr_align.py media/voiceover.wav script.txt src/timing.js
Needs: pip install pocketsphinx numpy
"""
import difflib, json, os, re, shutil, subprocess, sys
import numpy as np
from pocketsphinx import Decoder

wav, script_path, out_path = sys.argv[1:4]
ff = os.environ.get('FFMPEG_PATH') or shutil.which('ffmpeg') or 'ffmpeg'
SR = 16000
pcm = np.frombuffer(subprocess.run([ff, '-loglevel', 'error', '-i', wav, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                                   capture_output=True, check=True).stdout, dtype=np.int16)
duration = len(pcm) / SR

# ---- split at pauses (>= 0.35 s) into chunks of up to ~20 s, then recognise ----
hop = SR // 100
n = len(pcm) // hop
db = 20 * np.log10(np.sqrt(((pcm[: n * hop].astype(np.float32) / 32768).reshape(n, hop) ** 2).mean(axis=1)) + 1e-9)
silent = db < np.percentile(db, 90) - 30
cuts, i = [0], 0
while i < n:
    if silent[i]:
        j = i
        while j < n and silent[j]: j += 1
        if j - i >= 35: cuts.append((i + j) // 2)
        i = j
    else: i += 1
cuts.append(n)
chunks, start = [], cuts[0]
for c in cuts[1:]:
    if (c - start) > 2000 or c == n: chunks.append((start, c)); start = c
dec = Decoder(samprate=SR, loglevel='FATAL')
heard = []
for a, b in chunks:
    dec.start_utt(); dec.process_raw(pcm[a * hop: b * hop].tobytes(), full_utt=True); dec.end_utt()
    for s in dec.seg() or []:
        w = re.sub(r'\(\d+\)$', '', s.word)
        if w.startswith('<') or w.startswith('['): continue
        heard.append((w.lower(), a / 100 + s.start_frame / 100, a / 100 + (s.end_frame + 1) / 100))
print(f'recognised {len(heard)} words in {len(chunks)} chunks')

# ---- script tokens ----
text = open(script_path, encoding='utf-8').read().strip()
paras = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
words, toks = [], []  # words: display words; toks: (norm token, word index)
for pi, p in enumerate(paras):
    for w in p.replace('—', ' ').split():
        words.append({'w': w, 'p': pi})
        for t in re.split(r'-', w):
            t = re.sub(r"[^a-z']", '', t.lower().replace('’', "'")).strip("'")
            if t: toks.append((t, len(words) - 1))

norm = lambda t: t.replace("'", '')
A = [norm(t) for t, _ in toks]; B = [norm(w) for w, _, _ in heard]
def sim(x, y):
    if x == y: return 2.0
    r = difflib.SequenceMatcher(a=x, b=y).ratio()
    return 1.0 if r >= 0.6 else -0.3   # a misheard word still marks where a word was spoken
# global alignment (Needleman-Wunsch) so near-misses like form/for still pair up
GAP = -0.6
nA, nB = len(A), len(B)
S = np.zeros((nA + 1, nB + 1)); P = np.zeros((nA + 1, nB + 1), dtype=np.int8)
S[:, 0] = np.arange(nA + 1) * GAP; S[0, :] = np.arange(nB + 1) * GAP; P[1:, 0] = 1; P[0, 1:] = 2
for i in range(1, nA + 1):
    for j in range(1, nB + 1):
        c = (S[i - 1, j - 1] + sim(A[i - 1], B[j - 1]), S[i - 1, j] + GAP, S[i, j - 1] + GAP)
        k = int(np.argmax(c)); S[i, j] = c[k]; P[i, j] = k
tt = [None] * len(toks)
i, j, matched = nA, nB, 0
while i > 0 or j > 0:
    k = P[i, j]
    if k == 0:
        tt[i - 1] = (heard[j - 1][1], heard[j - 1][2]); matched += sim(A[i - 1], B[j - 1]) > 0
        i -= 1; j -= 1
    elif k == 1: i -= 1
    else: j -= 1
print(f'{matched}/{len(toks)} script tokens paired with recognised words')

# fill unmatched tokens by interpolating between neighbours
known = [k for k, v in enumerate(tt) if v]
for k in range(len(tt)):
    if tt[k]: continue
    prev = max([j for j in known if j < k], default=None); nxt = min([j for j in known if j > k], default=None)
    t0 = tt[prev][1] if prev is not None else 0.0
    t1 = tt[nxt][0] if nxt is not None else duration
    m = (nxt if nxt is not None else len(tt)) - (prev + 1 if prev is not None else 0)
    idx = k - (prev + 1 if prev is not None else 0)
    if t1 - t0 > 0.22 * m: t0 = t1 - 0.22 * m   # after a pause, the missing words sit just before the next one
    tt[k] = (t0 + (t1 - t0) * idx / m, t0 + (t1 - t0) * (idx + 1) / m)

out = []
for wi, w in enumerate(words):
    ks = [k for k, (_, o) in enumerate(toks) if o == wi]
    t0 = tt[ks[0]][0] if ks else (out[-1]['t1'] if out else 0)
    t1 = tt[ks[-1]][1] if ks else t0 + 0.1
    out.append({'w': w['w'], 'p': w['p'], 't0': round(t0, 3), 't1': round(max(t1, t0 + 0.05), 3)})
for k in range(1, len(out)):
    if out[k]['t0'] < out[k - 1]['t0']: out[k]['t0'] = out[k - 1]['t0']
data = {'duration': round(duration, 3), 'words': out, 'aligned': 'pocketsphinx-asr+script',
        'paragraphs': [next(w['t0'] for w in out if w['p'] == p) for p in range(len(paras))]}
with open(out_path, 'w') as f:
    f.write('// Generated by tools/asr_align.py (speech recognition matched to script.txt). Do not edit by hand.\n')
    f.write('window.KDP_TIMING = ' + json.dumps(data) + ';\n')
for p in range(len(paras)):
    print(f"  para {p + 1} @ {data['paragraphs'][p]:6.2f}s  {paras[p][:50]}")
