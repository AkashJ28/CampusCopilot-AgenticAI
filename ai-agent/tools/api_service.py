import requests
import config 

NODE_API_URL = config.NODE_API_BASE_URL

def get_data(endpoint: str, params: dict = None) -> str:
    """
    A centralized function to make GET requests to the Node.js backend API.
    """
    try:
        full_url = f"{NODE_API_URL}{endpoint}"
        print(f"--- API Service: Calling GET {full_url} with params {params} ---")
        
        response = requests.get(full_url, params=params)
        response.raise_for_status() # Raise an exception for bad status codes (4xx or 5xx)
        
        print(f"--- API Service: Call successful (Status {response.status_code}) ---")
        return response.text # Return the raw JSON text for the agent

    except requests.exceptions.HTTPError as http_err:
        print(f"--- API Service: HTTP error: {http_err} ---")
        return f"Error: The API returned a {http_err.response.status_code} error: {http_err.response.text}"
    except requests.exceptions.RequestException as e:
        print(f"--- API Service: Request error: {e} ---")
        return f"Error connecting to the API: {e}"
    except Exception as e:
        print(f"--- API Service: Unexpected error: {e} ---")
        return f"An unexpected error occurred: {e}"