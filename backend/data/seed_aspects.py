import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.database import SessionLocal
from app.models.warehouse import AspectDictionary

DEFAULT_ASPECTS = [
    {
        "aspect_name": "battery",
        "category": "Hardware",
        "keywords": ["battery", "charge", "charging", "battery life", "drain", "draining", "power"],
        "is_active": True
    },
    {
        "aspect_name": "performance",
        "category": "Hardware/Software",
        "keywords": ["performance", "slow", "lag", "speed", "fast", "slowness", "freeze", "freezing", "laggy", "crash", "crashing"],
        "is_active": True
    },
    {
        "aspect_name": "sound_quality",
        "category": "Audio",
        "keywords": ["sound", "audio", "bass", "volume", "treble", "noise", "speaker", "speakers", "mic", "microphone"],
        "is_active": True
    },
    {
        "aspect_name": "build_quality",
        "category": "Design",
        "keywords": ["build", "durable", "durability", "hinge", "material", "scratch", "fragile", "plastic", "sturdy", "casing"],
        "is_active": True
    },
    {
        "aspect_name": "display",
        "category": "Display",
        "keywords": ["display", "screen", "brightness", "oled", "resolution", "glare", "pixels", "refresh rate"],
        "is_active": True
    },
    {
        "aspect_name": "connectivity",
        "category": "Connectivity",
        "keywords": ["bluetooth", "wifi", "connection", "connect", "disconnect", "pairing", "range", "signal"],
        "is_active": True
    },
    {
        "aspect_name": "camera",
        "category": "Optics",
        "keywords": ["camera", "photo", "picture", "video", "zoom", "lens", "shutter", "low light", "portrait"],
        "is_active": True
    },
    {
        "aspect_name": "price_value",
        "category": "Value",
        "keywords": ["price", "expensive", "worth", "value", "cheap", "cost", "overpriced", "affordable"],
        "is_active": True
    },
    {
        "aspect_name": "comfort",
        "category": "Ergonomics",
        "keywords": ["comfort", "comfortable", "fit", "heavy", "ear", "ears", "weight", "ergonomic", "uncomfortable"],
        "is_active": True
    },
    {
        "aspect_name": "customer_support",
        "category": "Service",
        "keywords": ["support", "warranty", "service", "customer service", "return", "refund", "replacement"],
        "is_active": True
    }
]


def seed_aspects():
    db = SessionLocal()
    try:
        count = 0
        for item in DEFAULT_ASPECTS:
            existing = db.query(AspectDictionary).filter(AspectDictionary.aspect_name == item["aspect_name"]).first()
            if not existing:
                asp = AspectDictionary(
                    aspect_name=item["aspect_name"],
                    category=item["category"],
                    keywords=item["keywords"],
                    is_active=item["is_active"]
                )
                db.add(asp)
                count += 1
        db.commit()
        print(f"Successfully seeded {count} aspect dictionary entries.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_aspects()
