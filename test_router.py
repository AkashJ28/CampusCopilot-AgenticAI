import requests
import json
import time

AI_URL = "http://localhost:8000/ask"

user_identity = {
    "userId": "123",
    "role": "Student",
    "name": "Deepa Khanna",
    "entryDate": "2023-08-01",
    "studentId": "9"
}

def run_tests():
    print("================== Router Validation Report ==================")
    print("\nTest 1 (Edge Case): 'Hi, what is my name?'")
    try:
        query_1 = "Hi, what is my name?"
        res_1 = requests.post(AI_URL, json={"query": query_1, "user_identity": user_identity})
        res_1.raise_for_status()
        print(json.dumps(res_1.json().get("metadata", {}), indent=2))
    except Exception as e:
        print(f"Error: {e}")

    print("\nTest 2 (Cloud Case): 'Can you compare my Monday schedule with my Friday schedule and check for overlaps?'")
    try:
        query_2 = "Can you compare my Monday schedule with my Friday schedule and check for overlaps?"
        res_2 = requests.post(AI_URL, json={"query": query_2, "user_identity": user_identity})
        res_2.raise_for_status()
        print(json.dumps(res_2.json().get("metadata", {}), indent=2))
    except Exception as e:
        print(f"Error: {e}")

    print("\nTest 3 (Failover Simulation): 'SIMULATE_FAILOVER: Hi, what is my name?'")
    try:
        query_3 = "SIMULATE_FAILOVER: Hi, what is my name?"
        res_3 = requests.post(AI_URL, json={"query": query_3, "user_identity": user_identity})
        res_3.raise_for_status()
        print(json.dumps(res_3.json().get("metadata", {}), indent=2))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    run_tests()
