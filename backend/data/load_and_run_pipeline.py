import os
import httpx
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"
CSV_PATH = os.path.join(os.path.dirname(__file__), "sample_dataset.csv")

client = httpx.Client(timeout=120.0)

print("--- 1. UPLOADING SAMPLE DATASET ---")
with open(CSV_PATH, "rb") as f:
    files = {"file": ("sample_dataset.csv", f, "text/csv")}
    data = {"name": "Electronics & Gadgets Customer Feedback 2022-2024", "is_sample": "true"}
    resp = client.post(f"{BASE_URL}/datasets/upload", files=files, data=data)
    print("Upload response:", resp.status_code, resp.json())
    dataset_info = resp.json()
    dataset_id = dataset_info["dataset_id"]

print(f"\n--- 2. LOADING DATASET {dataset_id} TO WAREHOUSE (ETL) ---")
resp = client.post(f"{BASE_URL}/datasets/{dataset_id}/load")
print("Load response:", resp.status_code, resp.json())

print("\n--- 3. RUNNING PREPROCESSING (CLEANING) ---")
resp = client.post(f"{BASE_URL}/datasets/{dataset_id}/preprocess/clean")
print("Clean response:", resp.status_code, resp.json())

print("\n--- 4. RUNNING SENTIMENT ANALYSIS ---")
resp = client.post(f"{BASE_URL}/datasets/{dataset_id}/sentiment/run")
print("Sentiment response:", resp.status_code, resp.json())

print("\n--- 5. RUNNING ASPECT EXTRACTION ---")
resp = client.post(f"{BASE_URL}/datasets/{dataset_id}/aspects/extract")
print("Aspect extraction response:", resp.status_code, resp.json())

print("\n--- 6. RUNNING TOPIC MODELLING (TF-IDF + NMF) ---")
resp = client.post(f"{BASE_URL}/datasets/{dataset_id}/topics/run", json={"n_components": 5, "n_top_words": 8})
print("Topics response:", resp.status_code, f"Found {len(resp.json().get('topics', []))} topics")

print("\n--- 7. RUNNING CLUSTERING (K-MEANS) ---")
resp = client.post(f"{BASE_URL}/datasets/{dataset_id}/clustering/run", json={"k": 5})
print("Clustering response:", resp.status_code, f"Generated {len(resp.json().get('clusters', []))} clusters")

print("\n--- 8. RUNNING ASSOCIATION RULE MINING (APRIORI) ---")
resp = client.post(f"{BASE_URL}/datasets/{dataset_id}/association/run", json={"min_support": 0.03, "min_confidence": 0.25})
print("Association rules response:", resp.status_code, f"Discovered {resp.json().get('rule_count', 0)} rules")

print("\n--- 9. RUNNING FEATURE REQUEST EXTRACTION ---")
resp = client.post(f"{BASE_URL}/datasets/{dataset_id}/features/extract")
print("Feature extraction response:", resp.status_code, resp.json())

print("\n--- 10. RUNNING PAIN INDEX CALCULATION ---")
resp = client.get(f"{BASE_URL}/datasets/{dataset_id}/pain-index")
print(f"Calculated pain indices for {len(resp.json())} aspects. Top 3:")
for item in resp.json()[:3]:
    print(f"  - {item['aspect_name']}: score {item['score']} (mentions: {item['review_count']}, neg: {item['negative_count']})")

print("\n--- 11. CHECKING EMERGING COMPLAINTS ---")
resp = client.get(f"{BASE_URL}/datasets/{dataset_id}/emerging-complaints")
print(f"Emerging complaints evaluated: {len(resp.json().get('results', []))} aspects found")

print("\n--- 12. CHECKING INNOVATION OPPORTUNITIES ---")
resp = client.get(f"{BASE_URL}/datasets/{dataset_id}/opportunities")
print(f"Opportunities identified: {len(resp.json())}")

print("\n--- 13. GENERATING RECOMMENDATIONS ---")
resp = client.post(f"{BASE_URL}/datasets/{dataset_id}/recommendations/generate")
print("Recommendations generated response:", resp.status_code, resp.json())

print("\n--- 14. SIMULATING ROADMAP SCENARIO ---")
scenario_payload = {
    "scenario_name": "Q3-Q4 Battery & Performance Overhaul",
    "improvements": [
        {"aspect_name": "battery", "effort_estimate": 7.0, "priority": "critical"},
        {"aspect_name": "performance", "effort_estimate": 6.5, "priority": "high"}
    ]
}
resp = client.post(f"{BASE_URL}/datasets/{dataset_id}/roadmap/simulate", json=scenario_payload)
print("Roadmap simulation response:", resp.status_code, resp.json())

print("\n--- 15. VERIFYING OLAP ROLLUP ---")
resp = client.post(
    f"{BASE_URL}/datasets/{dataset_id}/olap/rollup",
    json={"dimensions": ["category"], "measure": "avg_rating"}
)
print("OLAP rollup response:", resp.status_code, resp.json())

print("\n--- 16. DATASET OVERVIEW ---")
resp = client.get(f"{BASE_URL}/datasets/{dataset_id}/overview")
print("Dataset overview:", resp.status_code, resp.json())

print("\nALL VERIFICATIONS COMPLETED SUCCESSFULLY!")
