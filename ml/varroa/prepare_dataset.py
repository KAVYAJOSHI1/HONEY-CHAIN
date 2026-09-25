"""Convert the EV2 Varroa dataset (Zenodo 13771384, CC-BY-4.0) into a YOLO classification dataset.

Each EV2 image is a crop of one bee, cut from 32 videos, labelled by whether a Varroa mite is
visible on it (labels.txt boxes refer to the original 1920x1080 video frame, not the crop).
Classes:
    bee          - no visible mite
    varroa_bee   - visible Varroa mite

Consecutive frames of a video are near-duplicates, so the train/val/test split is done by
video (never by frame) to keep the reported accuracy honest.
"""
import json
import random
import shutil
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "data" / "ev2"
OUT = ROOT / "data" / "cls"
SPLIT = {"train": 0.7, "val": 0.15, "test": 0.15}
SEED = 42
MIN_VIDEOS = 5


def find_image(video_name: str, frame_id: str) -> Path | None:
    stem = f"{video_name}_{frame_id.replace('_', '')}"
    for folder in ("dataset_infested", "dataset_free"):
        for ext in (".png", ".jpg"):
            p = SRC / folder / f"{stem}{ext}"
            if p.exists():
                return p
    return None


def split_videos(videos: dict[str, list]) -> dict[str, str]:
    """Assign whole videos to splits. Random search for the assignment whose per-split frame
    share and visible-mite share are closest to the targets, with >= MIN_VIDEOS in val and test."""
    names = sorted(videos)
    counts = {n: (sum(not v for _, v in videos[n]), sum(v for _, v in videos[n])) for n in names}
    tot_bee = sum(c[0] for c in counts.values())
    tot_var = sum(c[1] for c in counts.values())
    rng = random.Random(SEED)
    best, best_cost = None, float("inf")
    for _ in range(20000):
        order = names[:]
        rng.shuffle(order)
        n_val, n_test = rng.randint(MIN_VIDEOS, 7), rng.randint(MIN_VIDEOS, 7)
        assign = {n: "val" for n in order[:n_val]} | {n: "test" for n in order[n_val:n_val + n_test]} | {n: "train" for n in order[n_val + n_test:]}
        cost = 0.0
        for split, share in SPLIT.items():
            bee = sum(counts[n][0] for n in names if assign[n] == split)
            var = sum(counts[n][1] for n in names if assign[n] == split)
            cost += (bee / tot_bee - share) ** 2 + (var / tot_var - share) ** 2
        if cost < best_cost:
            best, best_cost = assign, cost
    return best


def main():
    labels = [json.loads(l) for l in (SRC / "labels.txt").read_text().splitlines() if l.strip()]
    videos = defaultdict(list)
    missing = 0
    for l in labels:
        name = l["video"].split("/")[1]
        img = find_image(name, l["id"])
        if img is None:
            missing += 1
            continue
        videos[name].append((img, l["varroa_visible"] == "yes"))

    assign = split_videos(videos)
    if OUT.exists():
        shutil.rmtree(OUT)
    stats = {s: [0, 0] for s in SPLIT}
    for name, items in videos.items():
        split = assign[name]
        for img, visible in items:
            cls = "varroa_bee" if visible else "bee"
            dst = OUT / split / cls / img.name
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.symlink_to(img.resolve())
            stats[split][int(visible)] += 1

    (OUT / "split.json").write_text(json.dumps({s: sorted(n for n in assign if assign[n] == s) for s in SPLIT}, indent=2))
    print(f"labels without image: {missing}")
    for s, (bee, varroa) in stats.items():
        vids = sum(1 for n in assign if assign[n] == s)
        print(f"{s:5s}: {vids:2d} videos, {bee + varroa:4d} images ({bee} bee, {varroa} varroa_bee)")


if __name__ == "__main__":
    main()
