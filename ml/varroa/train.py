"""Train the Honey Chain Varroa classifier (YOLOv8n-cls) on the prepared EV2 dataset, score it on
the held-out test videos, and copy the weights to backend/app/ai/weights/varroa_yolov8n_cls.pt."""
import json
import shutil
import sys
from pathlib import Path

from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score
from ultralytics import YOLO

ROOT = Path(__file__).parent
DATA = ROOT / "data" / "cls"
WEIGHTS_OUT = ROOT.parent.parent / "backend" / "app" / "ai" / "weights" / "varroa_yolov8n_cls.pt"
EPOCHS = int(sys.argv[1]) if len(sys.argv) > 1 else 20
IMGSZ = 224


def evaluate(weights: Path) -> dict:
    model = YOLO(str(weights))
    varroa_idx = [k for k, v in model.names.items() if v == "varroa_bee"][0]
    y_true, y_prob = [], []
    for cls in ("bee", "varroa_bee"):
        files = sorted((DATA / "test" / cls).iterdir())
        for i in range(0, len(files), 64):
            for r in model.predict([str(f) for f in files[i:i + 64]], imgsz=IMGSZ, device="cpu", verbose=False):
                y_prob.append(float(r.probs.data[varroa_idx]))
                y_true.append(int(cls == "varroa_bee"))
    y_pred = [int(p >= 0.5) for p in y_prob]
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
    return {
        "split": "test (7 held-out videos, never seen in training)",
        "images": len(y_true),
        "accuracy": round(accuracy_score(y_true, y_pred), 4),
        "precision_varroa": round(precision_score(y_true, y_pred), 4),
        "recall_varroa": round(recall_score(y_true, y_pred), 4),
        "f1_varroa": round(f1_score(y_true, y_pred), 4),
        "roc_auc": round(roc_auc_score(y_true, y_prob), 4),
        "confusion": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }


def main():
    model = YOLO("yolov8n-cls.pt")  # ImageNet-pretrained starting point
    model.train(
        data=str(DATA), epochs=EPOCHS, imgsz=IMGSZ, batch=32, device="cpu", workers=4,
        project=str(ROOT / "runs"), name="varroa_cls", exist_ok=True, seed=42, patience=6,
        fliplr=0.5, flipud=0.5, degrees=15, plots=True,
    )
    best = ROOT / "runs" / "varroa_cls" / "weights" / "best.pt"

    metrics = evaluate(best)
    (ROOT / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print(json.dumps(metrics, indent=2))

    WEIGHTS_OUT.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(best, WEIGHTS_OUT)
    shutil.copy(ROOT / "metrics.json", WEIGHTS_OUT.parent / "varroa_metrics.json")
    print(f"weights -> {WEIGHTS_OUT}")


if __name__ == "__main__":
    main()
