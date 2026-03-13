import os
from dotenv import load_dotenv

load_dotenv()


AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_DEPLOYMENT_NAME = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")

NODE_API_BASE_URL = os.getenv("NODE_API_BASE_URL", "http://localhost:3001")


if not all([AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT_NAME]):
    raise ValueError("One or more Azure OpenAI environment variables are missing. Please check your .env file.")

if not NODE_API_BASE_URL:
    raise ValueError("NODE_API_BASE_URL environment variable is missing. Please check your .env file.")
