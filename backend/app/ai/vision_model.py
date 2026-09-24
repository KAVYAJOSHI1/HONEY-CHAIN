import hashlib
import io
import random
from typing import Optional

from PIL import Image, UnidentifiedImageError

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
            "image_width": width,
            "image_height": height,
            "mite_count": num_mites,
            "bee_count": num_bees,
            "infection_rate_percentage": round(infection_rate, 2),
            "health_score": round(health_score, 1),
            "detections": detections,
        }


vision_model = YoloVarroaDetector()
