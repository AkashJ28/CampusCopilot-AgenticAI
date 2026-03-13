import requests
import json

AI_URL = "http://localhost:8000/ask"

user_identity = {
    "userId": "123",
    "role": "Student",
    "name": "Deepa Khanna",
    "entryDate": "2023-08-01",
    "studentId": "9"
}

def check_economics():
    print("================== Observability Report ==================")
    print("\nQuery: 'What is my name and GPA?'")
    try:
        query_text = "What is my name and GPA?"
        res = requests.post(AI_URL, json={"query": query_text, "user_identity": user_identity}, timeout=120)
        res.raise_for_status()
        data = res.json()
        print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Error checking economics query: {e}")

if __name__ == "__main__":
    check_economics()
