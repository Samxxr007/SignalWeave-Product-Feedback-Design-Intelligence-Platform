import csv
import hashlib
import os
import random
from datetime import date, timedelta

# Categories and Products
CATALOG = {
    "Smartphones": [
        ("PROD_PHONEX_PRO", "PhoneX Pro"),
        ("PROD_PHONEX_LITE", "PhoneX Lite"),
        ("PROD_GALAXY_NOVA", "GalaxyNova Plus"),
        ("PROD_PIXEL_PRO", "PixelPro Ultra")
    ],
    "Laptops": [
        ("PROD_ULTRABOOK", "UltraBook Elite"),
        ("PROD_AEROBOOK", "AeroBook Slim"),
        ("PROD_WORKSTATION", "WorkStation Z"),
        ("PROD_ZENBOOK", "ZenBook Pro")
    ],
    "Audio": [
        ("PROD_AUDIOMAX", "AudioMax Pro"),
        ("PROD_SOUNDWAVE", "SoundWave Mini"),
        ("PROD_BASSBEAT", "BassBeat Wireless"),
        ("PROD_QUIETTUNE", "QuietTune 500")
    ],
    "Wearables": [
        ("PROD_FITBAND", "FitBand Active"),
        ("PROD_TIMEMASTER", "TimeMaster Smart"),
        ("PROD_PULSEWATCH", "PulseWatch Sport"),
        ("PROD_HALORING", "HaloRing Gen2")
    ],
    "Smart Home": [
        ("PROD_ECHOSPHERE", "EchoSphere Hub"),
        ("PROD_VISIONCAM", "VisionCam Indoor"),
        ("PROD_SMARTGLOW", "SmartGlow Bulb"),
        ("PROD_THERMOSENSE", "ThermoSense Pro")
    ]
}

SOURCES = ["Amazon", "Best Buy", "Tech Reviews Blog", "User Forum"]
SOURCE_WEIGHTS = [0.40, 0.25, 0.20, 0.15]

FEATURE_REQUEST_PATTERNS = [
    "I wish it had a bigger battery and faster charging.",
    "Please add customizable EQ settings in the companion app.",
    "Would be better if the screen brightness was higher in daylight.",
    "Please fix the sluggish performance after the recent update.",
    "They need to add wireless charging support in the next version.",
    "Missing feature: noise cancellation mode should be toggleable from the device.",
    "Hope they add water resistance and better build materials.",
    "I really want a dedicated mute button on the hardware.",
    "Why don't they include a charger in the box? Would love to see that added.",
    "Needs better thermal dissipation because it gets really warm."
]

POSITIVE_TEMPLATES = [
    "The battery life is exceptional and easily lasts two full days.",
    "Performance is lightning fast and handles heavy multitasking smoothly.",
    "The sound quality is crystal clear with deep rich bass and great volume.",
    "Build quality is premium with solid aluminum materials and great durability.",
    "The display is vibrant with stunning colors and sharp OLED resolution.",
    "Bluetooth connectivity pairs instantly and never drops connection.",
    "Camera produces crisp photos with vibrant colors even in low light.",
    "Excellent value for the price compared to other flagship devices.",
    "Super comfortable to wear for extended periods without fatigue.",
    "Customer service was prompt and replaced my unit without hassle."
]

NEGATIVE_TEMPLATES = {
    "battery": [
        "The battery drains extremely fast and barely lasts four hours.",
        "Severe battery degradation occurred after just a few months.",
        "Charging is painfully slow and the device gets very hot while charging.",
        "The battery life is terrible and dies unexpectedly at twenty percent."
    ],
    "performance": [
        "System performance is slow and suffers from constant lag and stuttering.",
        "The device frequently freezes and apps crash randomly.",
        "Extremely sluggish performance when opening applications.",
        "Terrible slowness and laggy animations throughout the interface."
    ],
    "sound_quality": [
        "The sound quality is muddy with annoying static noise at high volume.",
        "Audio crackles continuously and the microphone volume is far too low.",
        "Very poor bass response and tinny harsh treble.",
        "The speakers sound distorted whenever volume exceeds fifty percent."
    ],
    "build_quality": [
        "Cheap plastic build quality that scratches and dents easily.",
        "The hinge feels loose and fragile after light usage.",
        "Disappointing build materials that feel flimsy and creak."
    ],
    "display": [
        "The screen brightness is dim and difficult to read outdoors.",
        "Noticed dead pixels on the display and severe screen glare."
    ],
    "connectivity": [
        "Constant bluetooth disconnects and poor wireless range.",
        "Wifi connection drops frequently and fails to reconnect automatically."
    ]
}


def random_date(start_year=2022, end_year=2024):
    # Holiday weight (Nov, Dec get 2.5x weight)
    start_dt = date(start_year, 1, 1)
    end_dt = date(end_year, 12, 31)
    days_span = (end_dt - start_dt).days

    while True:
        d = start_dt + timedelta(days=random.randint(0, days_span))
        # Holiday seasonality
        if d.month in (11, 12):
            return d
        else:
            if random.random() < 0.65:
                return d


def generate_dataset(num_records=1500, output_path="sample_dataset.csv"):
    random.seed(42)
    rows = []

    # Flatten products
    all_products = []
    for cat, prods in CATALOG.items():
        for pid, pname in prods:
            all_products.append((cat, pid, pname))

    for i in range(1, num_records + 1):
        review_id = f"REV_{i:05d}"
        cat, pid, pname = random.choice(all_products)
        review_date = random_date()
        source = random.choices(SOURCES, weights=SOURCE_WEIGHTS)[0]
        cust_hash = hashlib.sha256(f"customer_{i % 350}".encode()).hexdigest()[:8]
        customer_id = f"CUST_{cust_hash}"

        sentences = []
        is_bad = False

        # Specific Deliberate Patterns:
        if pname == "PhoneX Pro" and review_date >= date(2023, 6, 1):
            # Battery issues increasing sharply
            sentences.append(random.choice(NEGATIVE_TEMPLATES["battery"]))
            if random.random() < 0.6:
                # Co-occurrence of performance and battery
                sentences.append(random.choice(NEGATIVE_TEMPLATES["performance"]))
            is_bad = True
            rating = round(random.uniform(1.0, 2.5), 1)

        elif pname == "UltraBook Elite" and review_date >= date(2023, 9, 1):
            # Performance/slowness complaints
            sentences.append(random.choice(NEGATIVE_TEMPLATES["performance"]))
            if random.random() < 0.5:
                sentences.append(random.choice(NEGATIVE_TEMPLATES["battery"]))
            is_bad = True
            rating = round(random.uniform(1.0, 2.8), 1)

        elif pname == "AudioMax Pro" and review_date >= date(2024, 1, 1):
            # Sound quality emerging issue
            sentences.append(random.choice(NEGATIVE_TEMPLATES["sound_quality"]))
            is_bad = True
            rating = round(random.uniform(1.5, 3.0), 1)

        elif pname == "SoundWave Mini":
            # Consistently positive contrast product
            sentences.append(random.choice(POSITIVE_TEMPLATES))
            if random.random() < 0.5:
                sentences.append("Sound quality is superb and battery life is reliable.")
            rating = round(random.uniform(4.0, 5.0), 1)

        else:
            # General product distribution
            if random.random() < 0.40:
                # Negative review
                asp = random.choice(["battery", "performance", "sound_quality", "build_quality", "connectivity"])
                sentences.append(random.choice(NEGATIVE_TEMPLATES[asp]))
                if random.random() < 0.35 and asp in ("battery", "performance"):
                    # Co-occurrence
                    other_asp = "performance" if asp == "battery" else "battery"
                    sentences.append(random.choice(NEGATIVE_TEMPLATES[other_asp]))
                rating = round(random.uniform(1.0, 3.0), 1)
                is_bad = True
            else:
                # Positive review
                sentences.append(random.choice(POSITIVE_TEMPLATES))
                if random.random() < 0.4:
                    sentences.append(random.choice(POSITIVE_TEMPLATES))
                rating = round(random.uniform(3.5, 5.0), 1)

        # Feature requests distributed across 15% of reviews
        if random.random() < 0.15:
            sentences.append(random.choice(FEATURE_REQUEST_PATTERNS))

        review_text = " ".join(sentences)

        rows.append({
            "review_id": review_id,
            "product_id": pid,
            "product_name": pname,
            "category": cat,
            "review_text": review_text,
            "rating": rating,
            "review_date": str(review_date),
            "source": source,
            "customer_id": customer_id,
            "is_synthetic": True
        })

    # Write to CSV
    fieldnames = [
        "review_id", "product_id", "product_name", "category",
        "review_text", "rating", "review_date", "source",
        "customer_id", "is_synthetic"
    ]
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Generated {len(rows)} reviews at {output_path}")


if __name__ == "__main__":
    out = os.path.join(os.path.dirname(__file__), "sample_dataset.csv")
    generate_dataset(1500, out)
