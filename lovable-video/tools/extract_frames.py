#!/usr/bin/env python3
"""Extract the real screen-recording moments listed in clips.json as JPEG frames (frames/<clip>/NNNN.jpg)."""
import json, os, subprocess, shutil, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ff = os.environ.get('FFMPEG_PATH') or shutil.which('ffmpeg') or 'ffmpeg'
clips = {k: v for k, v in json.load(open(os.path.join(root, 'clips.json'))).items() if not k.startswith('_')}
meta = {}
for name, c in clips.items():
    out = os.path.join(root, 'frames', name)
    shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
    dur = max(c['to'] - c['from'], 0.05)
    args = [ff, '-loglevel', 'error', '-y', '-ss', str(c['from']), '-i', os.path.join(root, 'media', 'screen.m4v'), '-t', str(dur),
            '-vf', f"fps={c['fps']}", '-q:v', '3', os.path.join(out, '%04d.jpg')]
    if c['from'] == c['to']:
        args = [ff, '-loglevel', 'error', '-y', '-ss', str(c['from']), '-i', os.path.join(root, 'media', 'screen.m4v'), '-frames:v', '1', '-q:v', '2', os.path.join(out, '0001.jpg')]
    subprocess.run(args, check=True)
    n = len(os.listdir(out))
    meta[name] = dict(c, count=n)
    print(f'{name}: {n} frames')
with open(os.path.join(root, 'frames', 'index.json'), 'w') as f:
    json.dump(meta, f)
