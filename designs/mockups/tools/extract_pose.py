"""Regenerate the real-video assets used by mock-ui-shadcn-c.html (offline, local only).

1. Reads videos/sample1.MOV (read-only), auto-rotated to portrait by OpenCV.
2. Runs MediaPipe Pose Landmarker (heavy) in VIDEO mode on every frame.
3. Keeps every 2nd frame (~30 fps) and writes:
   - assets/sample1-360p.mp4   (360x640 H.264)
   - assets/sample1-pose.json  (33 landmarks [x, y, visibility] per frame, normalised)
4. Injects 17 joints into the `const POSE = {...};` line of mock-ui-shadcn-c.html.

Setup (any Python 3.12 venv):
    pip install mediapipe opencv-python
    download https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task
    into this tools/ folder (not committed).
Run:  python designs/mockups/tools/extract_pose.py
No frames or video data leave this machine.
"""
import json
import os
import re

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mpt
from mediapipe.tasks.python import vision

TOOLS = os.path.dirname(os.path.abspath(__file__))
MOCKUPS = os.path.dirname(TOOLS)
ROOT = os.path.dirname(os.path.dirname(MOCKUPS))
SRC = os.path.join(ROOT, "videos", "sample1.MOV")
OUT = os.path.join(MOCKUPS, "assets")
MODEL = os.path.join(TOOLS, "pose_landmarker_heavy.task")
HTML = os.path.join(MOCKUPS, "mock-ui-shadcn-c.html")
W, H = 360, 640
STEP = 2
# nose, shoulders, elbows, wrists, hips, knees, ankles, heels, toes (order matches JOINTS in the mockup)
JOINTS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]


def extract():
    os.makedirs(OUT, exist_ok=True)
    opts = vision.PoseLandmarkerOptions(
        base_options=mpt.BaseOptions(model_asset_path=MODEL),
        running_mode=vision.RunningMode.VIDEO, num_poses=1)
    lm = vision.PoseLandmarker.create_from_options(opts)
    cap = cv2.VideoCapture(SRC)
    fps = cap.get(cv2.CAP_PROP_FPS)
    writer = cv2.VideoWriter(os.path.join(OUT, "sample1-360p.mp4"),
                             cv2.VideoWriter_fourcc(*"avc1"), fps / STEP, (W, H))
    if not writer.isOpened():
        raise SystemExit("avc1 (H.264) encoder unavailable in this OpenCV build")
    frames, i = [], 0
    while True:
        ok, f = cap.read()
        if not ok:
            break
        t_ms = int(round(i * 1000 / fps))
        small = cv2.resize(f, (W * 2, H * 2), interpolation=cv2.INTER_AREA)
        img = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(small, cv2.COLOR_BGR2RGB))
        res = lm.detect_for_video(img, t_ms)
        if i % STEP == 0:
            writer.write(cv2.resize(small, (W, H), interpolation=cv2.INTER_AREA))
            pts = None
            if res.pose_landmarks:
                pts = [[round(p.x, 4), round(p.y, 4), round(p.visibility, 2)] for p in res.pose_landmarks[0]]
            frames.append({"t": round(t_ms / 1000, 3), "k": pts})
        i += 1
    writer.release()
    data = {"source": "sample1.MOV", "model": "pose_landmarker_heavy (MediaPipe Tasks, offline)",
            "fps": round(fps / STEP, 3), "width": W, "height": H, "frames": frames}
    with open(os.path.join(OUT, "sample1-pose.json"), "w") as fh:
        json.dump(data, fh, separators=(",", ":"))
    print("frames", i, "kept", len(frames), "missing", sum(1 for f in frames if f["k"] is None))
    return data


def inject(d):
    if any(f["k"] is None for f in d["frames"]):
        raise SystemExit("frames without a pose; the mockup expects every frame to have one")
    k = [[v for j in JOINTS for v in (round(f["k"][j][0] * 1000), round(f["k"][j][1] * 1000), round(f["k"][j][2] * 100))]
         for f in d["frames"]]
    payload = json.dumps({"fps": d["fps"], "w": d["width"], "h": d["height"], "k": k}, separators=(",", ":"))
    with open(HTML, encoding="utf-8") as fh:
        s = fh.read()
    s, n = re.subn(r"const POSE = \{[^\n]*\};", lambda _: "const POSE = " + payload + ";", s)
    if n != 1:
        raise SystemExit("expected exactly one `const POSE = {...};` line in the mockup")
    with open(HTML, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(s)
    print("injected", len(payload), "bytes")


if __name__ == "__main__":
    inject(extract())
