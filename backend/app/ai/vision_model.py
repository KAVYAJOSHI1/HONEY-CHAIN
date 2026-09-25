import hashlib
import io
import json
import logging
import math
import os
import random
from pathlib import Path
from typing import Optional

from PIL import Image, UnidentifiedImageError

logger = logging.getLogger("honeychain.vision")

# Preset scenarios let the demo show a predictable healthy / infested frame.
PRESETS = {
    "healthy": {"mites": (0, 1), "bees": (70, 95)},
    "varroa": {"mites": (8, 12), "bees": (45, 60)},
}


class InvalidImageError(ValueError):
    pass


class YoloVarroaDetector:
    """Prototype stand-in for a YOLO Varroa detector.

    Inference is simulated, but deterministic: the same image always yields the same
    detections (the RNG is seeded from the image hash), so results are reproducible.
    Bounding boxes are returned both in pixels and normalised (0-1) so the UI can
    overlay them on the uploaded photo.
    """

    model_loaded = True
    classes = ["varroa_mite", "healthy_bee", "queen"]

    def analyze_image(self, image_bytes: bytes, scenario: Optional[str] = None) -> dict:
        try:
            img = Image.open(io.BytesIO(image_bytes))
            width, height = img.size
        except (UnidentifiedImageError, OSError) as exc:
            raise InvalidImageError("File is not a readable JPEG/PNG image.") from exc

        rng = random.Random(hashlib.sha256(image_bytes + (scenario or "").encode()).hexdigest())
        preset = PRESETS.get((scenario or "").lower())
        if preset:
            num_mites = rng.randint(*preset["mites"])
            num_bees = rng.randint(*preset["bees"])
        else:
            num_mites = rng.randint(0, 6)
            num_bees = rng.randint(45, 95)

        detections = []
        for _ in range(num_mites):
            w, h = rng.uniform(0.05, 0.09), rng.uniform(0.05, 0.09)
            x, y = rng.uniform(0.03, 0.97 - w), rng.uniform(0.03, 0.97 - h)
            detections.append({
                "class": "varroa_mite",
                "confidence": round(rng.uniform(0.78, 0.98), 2),
                "bbox_norm": [round(x, 4), round(y, 4), round(w, 4), round(h, 4)],
                "bbox": [int(x * width), int(y * height), int((x + w) * width), int((y + h) * height)],
            })

        infection_rate = (num_mites / num_bees) * 100 if num_bees else 0.0
        # ~3 % mite load is the common treatment threshold; score falls 2.5 points per % infestation.
        health_score = max(0.0, 100 - infection_rate * 2.5)

        return {
            "status": "success",
            "model": "simulated",
            "image_width": width,
            "image_height": height,
            "mite_count": num_mites,
            "bee_count": num_bees,
            "infection_rate_percentage": round(infection_rate, 2),
            "health_score": round(health_score, 1),
            "detections": detections,
        }


WEIGHTS = Path(__file__).parent / "weights" / "varroa_yolov8n_cls.pt"
METRICS = Path(__file__).parent / "weights" / "varroa_metrics.json"
# Photos up to this size are treated as a close-up of one bee; larger ones are split into regions.
SINGLE_BEE_MAX_SIDE = 800
VARROA_THRESHOLD = 0.5


class VarroaClassifier:
    """YOLOv8n-cls trained on the EV2 dataset (Zenodo 13771384): is a Varroa mite visible on this bee?

    A close-up photo is classified whole. A larger frame photo is split into a grid of square
    regions, each classified separately; regions scored as Varroa-positive are returned as
    detections so the UI can outline them. Infestation = positive regions / regions analysed.
    """

    model_loaded = True
    classes = ["bee", "varroa_bee"]

    def __init__(self, weights: Path):
        from ultralytics import YOLO

        self.model = YOLO(str(weights))
        self.varroa_idx = next(k for k, v in self.model.names.items() if v == "varroa_bee")
        self.metrics = json.loads(METRICS.read_text()) if METRICS.exists() else None

    @staticmethod
    def _regions(width: int, height: int) -> list[tuple[int, int, int, int]]:
        if max(width, height) <= SINGLE_BEE_MAX_SIDE:
            return [(0, 0, width, height)]
        side = min(width, height) // 2
        cols, rows = math.ceil(width / side), math.ceil(height / side)
        boxes = []
        for r in range(rows):
            for c in range(cols):
                x1, y1 = min(c * side, width - side), min(r * side, height - side)
                boxes.append((x1, y1, x1 + side, y1 + side))
        return boxes

    def analyze_image(self, image_bytes: bytes, scenario: Optional[str] = None) -> dict:
        # `scenario` only steers the simulated fallback; a trained model reports what it sees.
        try:
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except (UnidentifiedImageError, OSError) as exc:
            raise InvalidImageError("File is not a readable JPEG/PNG image.") from exc
        width, height = img.size

        boxes = self._regions(width, height)
        crops = [img.crop(b) for b in boxes]
        results = self.model.predict(crops, imgsz=224, device="cpu", verbose=False)
        probs = [float(r.probs.data[self.varroa_idx]) for r in results]

        detections = [
            {
                "class": "varroa_bee",
                "confidence": round(p, 2),
                "bbox_norm": [round(x1 / width, 4), round(y1 / height, 4), round((x2 - x1) / width, 4), round((y2 - y1) / height, 4)],
                "bbox": [x1, y1, x2, y2],
            }
            for p, (x1, y1, x2, y2) in zip(probs, boxes) if p >= VARROA_THRESHOLD
        ]
        infection_rate = len(detections) / len(boxes) * 100
        # Single close-up: score from the model's confidence; frame: 2.5 points per % infested regions.
        health_score = (1 - probs[0]) * 100 if len(boxes) == 1 else max(0.0, 100 - infection_rate * 2.5)

        return {
            "status": "success",
            "model": "yolov8n-cls (EV2)",
            "image_width": width,
            "image_height": height,
            "mite_count": len(detections),
            "bee_count": len(boxes),
            "regions_analyzed": len(boxes),
            "varroa_probability": round(max(probs), 4),
            "infection_rate_percentage": round(infection_rate, 2),
            "health_score": round(health_score, 1),
            "detections": detections,
        }


def load_vision_model():
    """Trained classifier when its weights and ultralytics are available, else the simulated detector.
    VARROA_MODEL=simulated forces the simulator (used by tests and low-resource deployments)."""
    if os.getenv("VARROA_MODEL", "").lower() != "simulated" and WEIGHTS.exists():
        try:
            return VarroaClassifier(WEIGHTS)
        except Exception as exc:  # missing torch/ultralytics or corrupt weights
            logger.warning("Varroa classifier unavailable, using simulated detector: %s", exc)
    return YoloVarroaDetector()


vision_model = load_vision_model()
