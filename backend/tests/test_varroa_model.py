"""Checks for the trained Varroa classifier (skipped when its weights or ultralytics are absent)."""
import io
from pathlib import Path

import pytest
from PIL import Image

from app.ai import vision_model as vm

SAMPLES = Path(__file__).resolve().parents[2] / "frontend" / "public" / "samples"

pytest.importorskip("ultralytics")
pytestmark = pytest.mark.skipif(not vm.WEIGHTS.exists(), reason="trained Varroa weights not present")


@pytest.fixture(scope="module")
def classifier():
    return vm.VarroaClassifier(vm.WEIGHTS)


def png(size, color=(200, 170, 90)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, format="PNG")
    return buf.getvalue()


def test_held_out_samples_are_classified_correctly(classifier):
    healthy = classifier.analyze_image((SAMPLES / "bee-healthy.png").read_bytes())
    varroa = classifier.analyze_image((SAMPLES / "bee-varroa.png").read_bytes())
    assert healthy["mite_count"] == 0 and healthy["health_score"] >= 70
    assert varroa["mite_count"] == 1 and varroa["health_score"] < 70
    assert varroa["varroa_probability"] > healthy["varroa_probability"]


def test_close_up_is_one_region_and_frame_is_split(classifier):
    assert classifier.analyze_image(png((400, 380)))["regions_analyzed"] == 1
    frame = classifier.analyze_image(png((1920, 1080)))
    assert frame["regions_analyzed"] == 8  # 540 px squares: 4 columns x 2 rows
    assert all(len(d["bbox_norm"]) == 4 for d in frame["detections"])


def test_scenario_does_not_change_trained_output(classifier):
    img = (SAMPLES / "bee-healthy.png").read_bytes()
    assert classifier.analyze_image(img) == classifier.analyze_image(img, scenario="varroa")


def test_rejects_non_images(classifier):
    with pytest.raises(vm.InvalidImageError):
        classifier.analyze_image(b"not an image")
