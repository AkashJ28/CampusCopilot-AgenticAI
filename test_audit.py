import requests
import json
import time

BACKEND_URL = "http://localhost:3001/api/auth/login"
AI_URL = "http://localhost:8000/ask"

EMAIL = "mech23004@student.uni.edu"
PASSWORD = "password123"

def run_audit():
    print("--- 1. Authentication & Session Test ---")
    try:
        res = requests.post(BACKEND_URL, json={"email": EMAIL, "password": PASSWORD})
        res.raise_for_status()
        data = res.json()
        token = data.get("token")
        user = data.get("user", {})
        
        if token and user.get("name"):
            print(f"PASS: Logged in successfully. Token received. User Name: {user.get('name')}")
        else:
            print(f"FAIL: Missing token or user name in response. {data}")
            return
            
        user_identity = {
            "userId": user.get("_id"),
            "role": user.get("role"),
            "name": user.get("name"),
            "entryDate": user.get("entryDate"),
            "studentId": user.get("studentId"),
        }
    except Exception as e:
        print(f"FAIL: Authentication exception - {e}")
        return

    print("\n--- 2. Dual-LLM Functional Test (Edge) ---")
    query_edge = "Hello, what is my name?"
    try:
        t0 = time.time()
        res_edge = requests.post(AI_URL, json={"query": query_edge, "user_identity": user_identity})
        res_edge.raise_for_status()
        data_edge = res_edge.json()
        metadata_edge = data_edge.get("metadata", {})
        
        tier = metadata_edge.get("tier")
        ttft = metadata_edge.get("ttft_sec")
        
        if tier == "local" and ttft is not None:
            print(f"PASS: Edge model handled query correctly. Tier: {tier}, TTFT: {ttft}s")
            print(f"Response: {data_edge.get('response')}")
        else:
            print(f"FAIL: Expected tier 'local' and ttft. Got Tier: {tier}, TTFT: {ttft}")
    except Exception as e:
         print(f"FAIL: AI Agent request for Edge failed - {e}")

    print("\n--- 3. Dual-LLM Functional Test (Cloud) ---")
    query_cloud = "Compare my current semester schedule with the enrollment for next year and sort out the clashes"
    try:
        res_cloud = requests.post(AI_URL, json={"query": query_cloud, "user_identity": user_identity})
        res_cloud.raise_for_status()
        data_cloud = res_cloud.json()
        metadata_cloud = data_cloud.get("metadata", {})
        
        tier = metadata_cloud.get("tier")
        if tier == "cloud":
            print(f"PASS: Cloud model handled complex query. Tier: {tier}")
        else:
            print(f"FAIL: Expected tier 'cloud'. Got Tier: {tier}")
            
    except Exception as e:
        print(f"FAIL: AI Agent request for Cloud failed - {e}")

    print("\n--- 4. Research Metric Verification ---")
    keys = ["ttft_sec", "total_latency_sec", "model_load_time", "routing_confidence"]
    missing = [k for k in keys if k not in metadata_edge]
    
    if not missing:
        print("PASS: All required metrics present in metadata.")
    else:
        print(f"FAIL: Missing metrics: {missing}")

    print("\n--- 5. Hardware Check (RTX 4060 / Edge LLM Latency) ---")
    lat = metadata_edge.get('total_latency_sec', 999)
    if lat < 5.0: # Giving some leeway for first-time run, though 500ms is ideal, load might be slow
        print(f"INFO: Local Edge query Total Latency: {lat}s")
    else:
        print(f"WARN: Local Edge query Total Latency: {lat}s is somewhat high.")
        
    print("\n--- 6. Sample JSON Routed Request Output (Edge) ---")
    print(json.dumps(data_edge, indent=2))

if __name__ == "__main__":
    run_audit()
