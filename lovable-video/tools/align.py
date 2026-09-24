#!/usr/bin/env python3
"""Rough forced alignment of script.txt against the voiceover, without an ASR model.

1. Find pauses in the audio from an RMS energy envelope.
2. Split the script into phrases at punctuation.
3. Dynamic programming assigns pauses to phrase boundaries so that each run of
   speech between assigned pauses matches its expected length (syllables x rate).
4. Words inside a run are spread by syllable count.

Writes src/timing.js: window.KDP_TIMING = {duration, words:[{w,t0,t1}], paragraphs:[t0...]}

Usage: python3 tools/align.py audio/voiceover.wav script.txt src/timing.js
"""
import json, re, sys, wave
import numpy as np

wav_path, script_path, out_path = sys.argv[1:4]

# ---------- audio ----------
with wave.open(wav_path) as w:
    sr = w.getframerate(); ch = w.getnchannels(); sw = w.getsampwidth()
    raw = w.readframes(w.getnframes())
dtype = {1: np.int8, 2: np.int16, 4: np.int32}[sw]
x = np.frombuffer(raw, dtype=dtype).astype(np.float32)
if ch > 1:
    x = x.reshape(-1, ch).mean(axis=1)
x /= float(np.iinfo(dtype).max)
duration = len(x) / sr

hop = int(sr * 0.01)
n = len(x) // hop
rms = np.sqrt(np.mean(x[: n * hop].reshape(n, hop) ** 2, axis=1) + 1e-12)
db = 20 * np.log10(rms)
speech_db = np.percentile(db, 90)
thresh = speech_db - 30
silent = db < thresh

# silence runs >= 180ms
pauses = []
i = 0
while i < n:
    if silent[i]:
        j = i
        while j < n and silent[j]:
            j += 1
        if (j - i) >= 18:
            pauses.append((i * 0.01, j * 0.01))
        i = j
    else:
        i += 1
lead = pauses[0][1] if pauses and pauses[0][0] <= 0.02 else 0.0
tail = pauses[-1][0] if pauses and pauses[-1][1] >= duration - 0.05 else duration
inner = [p for p in pauses if p[0] > lead + 0.05 and p[1] < tail - 0.05]

# ---------- text ----------
text = open(script_path, encoding="utf-8").read().strip()
paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]

def syl(word):
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return 1
    if w.isupper() or word.strip("\"'.,:;?!—").isupper() and len(w) <= 4:
        return len(w)  # acronyms: A-I, K-D-P
    groups = re.findall(r"[aeiouy]+", w)
    c = len(groups)
    if w.endswith("e") and not w.endswith(("le", "ee")) and c > 1:
        c -= 1
    return max(1, c)

words = []   # dicts: w, syl, para, brk (break strength after word)
for pi, p in enumerate(paras):
    toks = p.replace("—", " — ").split()
    for tok in toks:
        if tok == "—":
            if words:
                words[-1]["brk"] = max(words[-1]["brk"], 2)
            continue
        s = syl(tok)
        if re.fullmatch(r"[A-Z]{2,4}", re.sub(r"[^A-Za-z]", "", tok)):
            s = len(re.sub(r"[^A-Za-z]", "", tok))
        brk = 0
        if re.search(r"[,;]\W*$", tok): brk = 1
        if re.search(r"[:]\W*$", tok): brk = 2
        if re.search(r"[.?!]\W*$", tok): brk = 3
        words.append({"w": tok, "syl": s, "para": pi, "brk": brk})
    words[-1]["brk"] = 4

# phrases split at any break
phrases = []
cur = []
for wi, w in enumerate(words):
    cur.append(wi)
    if w["brk"] > 0:
        phrases.append(cur); cur = []
if cur:
    phrases.append(cur)
P = len(phrases)
psyl = [sum(words[i]["syl"] for i in ph) for ph in phrases]
pbrk = [words[ph[-1]]["brk"] for ph in phrases]
csyl = np.concatenate([[0], np.cumsum(psyl)])

speech_total = (tail - lead) - sum(b - a for a, b in inner)
rate = speech_total / csyl[-1]  # seconds per syllable

# ---------- DP ----------
# state: (pause k assigned to boundary after phrase j). Boundaries 0..P-2.
M = len(inner)
INF = 1e18
brk_bonus = {1: 0.0, 2: 0.0, 3: 0.0, 4: 0.0}
def seg_cost(t_start, t_end, j0, j1):
    """speech from t_start to t_end covers phrases j0..j1 inclusive"""
    exp = (csyl[j1 + 1] - csyl[j0]) * rate
    act = t_end - t_start
    return ((act - exp) / (0.6 + 0.25 * exp)) ** 2

def skip_pause_cost(k):
    # leaving a pause unassigned (mid-phrase breath): allowed but costly for long pauses
    d = inner[k][1] - inner[k][0]
    return 4.0 + 20.0 * d

def unused_break_cost(j):
    # a sentence end with no pause is a bit unlikely
    return {1: 0.05, 2: 0.3, 3: 0.8, 4: 3.0}[pbrk[j]]

# Simplify: every pause must map to a boundary (mid-phrase pauses get merged by
# allowing a pause to be "absorbed", i.e. skipped, with a cost).
# dp[k][j] = min cost where pause k is at boundary j (after phrase j)
dp = np.full((M + 1, P), INF)
back = {}
# virtual start: "pause" -1 at boundary -1 at time lead
def prev_iter(k):
    yield (-1, -1)
    for kk in range(k):
        yield (kk, None)

start_states = {(-1, -1): 0.0}
best = {}
best[(-1, -1)] = (0.0, None)
order = [(k, j) for k in range(M) for j in range(P - 1)]
for k in range(M):
    for j in range(P - 1):
        cands = []
        # from start
        prevs = [(-1, -1)] + [(kk, jj) for kk in range(max(0, k - 4), k) for jj in range(j)]
        for (kk, jj) in prevs:
            if (kk, jj) not in best:
                continue
            base = best[(kk, jj)][0]
            t0 = lead if kk < 0 else inner[kk][1]
            t1 = inner[k][0]
            if t1 <= t0:
                continue
            c = base + seg_cost(t0, t1, jj + 1, j)
            c += sum(skip_pause_cost(q) for q in range(kk + 1, k))
            c += sum(unused_break_cost(q) for q in range(jj + 1, j))
            cands.append((c, (kk, jj)))
        if cands:
            best[(k, j)] = min(cands)
# finish
fin = []
for (kk, jj), (c, _) in list(best.items()):
    t0 = lead if kk < 0 else inner[kk][1]
    if jj >= P - 1:
        continue
    cc = c + seg_cost(t0, tail, jj + 1, P - 1)
    cc += sum(skip_pause_cost(q) for q in range(kk + 1, M))
    cc += sum(unused_break_cost(q) for q in range(jj + 1, P - 1))
    fin.append((cc, (kk, jj)))
cost, state = min(fin)
assign = []
while state != (-1, -1):
    assign.append(state)
    state = best[state][1]
assign.reverse()

# ---------- word times ----------
runs = []  # (t0, t1, j0, j1)
prev_t, prev_j = lead, -1
for (k, j) in assign:
    runs.append((prev_t, inner[k][0], prev_j + 1, j))
    prev_t, prev_j = inner[k][1], j
runs.append((prev_t, tail, prev_j + 1, P - 1))

wt = [None] * len(words)
for (t0, t1, j0, j1) in runs:
    ids = [i for ph in phrases[j0 : j1 + 1] for i in ph]
    # internal (unassigned) pauses inside this run: exclude them from speech time
    inside = [p for p in inner if p[0] >= t0 and p[1] <= t1]
    total_syl = sum(words[i]["syl"] for i in ids)
    speech = (t1 - t0) - sum(b - a for a, b in inside)
    def to_real(s):  # speech-time offset -> real time
        t = t0; left = s
        for a, b in inside:
            if t + left <= a:
                break
            left -= (a - t); t = b
        return t + left
    acc = 0.0
    for i in ids:
        s0 = acc / total_syl * speech
        acc += words[i]["syl"]
        s1 = acc / total_syl * speech
        wt[i] = (round(to_real(s0), 3), round(to_real(s1), 3))

out_words = [{"w": w["w"], "p": w["para"], "t0": wt[i][0], "t1": wt[i][1]} for i, w in enumerate(words)]
para_starts = []
for pi in range(len(paras)):
    para_starts.append(next(w["t0"] for w in out_words if w["p"] == pi))

data = {"duration": round(duration, 3), "words": out_words, "paragraphs": para_starts,
        "pauses": [[round(a, 2), round(b, 2)] for a, b in inner]}
with open(out_path, "w") as f:
    f.write("// Generated by tools/align.py from the voiceover + script.txt. Do not edit by hand.\n")
    f.write("window.KDP_TIMING = " + json.dumps(data) + ";\n")

print(f"duration {duration:.2f}s, lead {lead:.2f}, tail {tail:.2f}, pauses {len(inner)}, phrases {P}, rate {1/rate:.2f} syl/s, cost {cost:.2f}")
for pi, t in enumerate(para_starts):
    first = " ".join(w["w"] for w in out_words if w["p"] == pi)[:60]
    print(f"  para {pi+1:2d} @ {t:7.2f}s  {first}")
for (t0, t1, j0, j1) in runs:
    txt = " ".join(words[i]["w"] for ph in phrases[j0:j1+1] for i in ph)
    print(f"  {t0:7.2f}-{t1:7.2f}  {txt[:90]}")
