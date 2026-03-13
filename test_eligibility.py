import requests
import json
import time

API_URL = "http://127.0.0.1:8000/ask"

# Using Student ID 9 based on the context expectation
payload = {
    "query": "Based on my GPA, which companies can I apply for?",
    "user_identity": {
        "userId": 9,
        "roleId": 1,
        "name": "Arjun Patel",
        "email": "student8@uni.edu",
        "studentId": 9,
        "entryDate": "2023-08-01",
        "iat": 1740578500,
        "exp": 1740664900
    }
}

print("================== Feature 4 Verification Test ==================\n")
print(f"Query: '{payload['query']}'\n")

try:
    response = requests.post(API_URL, json=payload, timeout=60)
    response.raise_for_status()

    data = response.json()
    
    # Strip potentially bulky response texts if needed, but show logic_trace
    print("Agent Response:\n", data.get("response", "No response text"))
    print("\nMetadata:")
    print(json.dumps(data.get("metadata", {}), indent=2))
    
    trace = data.get("metadata", {}).get("logic_trace", "")
    if "check_job_eligibility" in trace and "ID Verified" in trace:
        print("\n✅ Verification Success: Tool Selected -> check_job_eligibility -> ID Verified")
    else:
        print("\n❌ Verification Failed: Trace did not match expected path.")

except requests.exceptions.RequestException as e:
    print(f"❌ Error communicating with API: {e}")
