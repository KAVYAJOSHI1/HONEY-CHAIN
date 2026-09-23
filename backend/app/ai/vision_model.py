import random

class YoloVarroaDetector:
    def __init__(self):
        self.model_loaded = True
        self.classes = ["varroa_mite", "healthy_bee", "queen"]

    def analyze_image(self, image_bytes: bytes):
        """
        Mocks the YOLO inference process on a hive frame image.
        In a real scenario, this would convert bytes to a PIL Image or cv2 mat,
        pass it through a PyTorch/ONNX model, and return bounding boxes.
        """
        # Simulate processing time
        # time.sleep(0.5)
        
        # Randomly generate some mock detections
        num_mites = random.randint(0, 5)
        num_bees = random.randint(40, 100)
        
        detections = []
        for _ in range(num_mites):
            detections.append({
                "class": "varroa_mite",
                "confidence": round(random.uniform(0.75, 0.99), 2),
                "bbox": [
                    random.randint(0, 400), # xmin
                    random.randint(0, 400), # ymin
                    random.randint(410, 500), # xmax
                    random.randint(410, 500)  # ymax
                ]
            })
            
        infection_rate = (num_mites / num_bees) * 100 if num_bees > 0 else 0
        health_score = max(0, 100 - (infection_rate * 10)) # Simple mock scoring
        
        return {
            "status": "success",
            "mite_count": num_mites,
            "bee_count": num_bees,
            "infection_rate_percentage": round(infection_rate, 2),
            "health_score": round(health_score, 1),
            "detections": detections
        }

# Singleton instance
vision_model = YoloVarroaDetector()
