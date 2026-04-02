"""
Application configuration.
All settings, limits, and environment variables in one place.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# === Environment ===
ENVIRONMENT = os.getenv("ENVIRONMENT", "production")

# === File Upload Limits ===
MAX_FILE_SIZE_MB = 5
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
ALLOWED_UPLOAD_TYPES = {
    "application/pdf": ".pdf",
    "application/json": ".json",
    "text/plain": ".txt",
    "text/csv": ".csv",
}
UPLOAD_DIR = "data/uploads"
GENERATED_DIR = "data/generated"

# === Database ===
DB_PATH = os.getenv("DB_PATH", "data/copilot.db")

# === ChromaDB ===
CHROMA_DIR = os.getenv("CHROMA_DIR", "data/chroma_db")
CHROMA_COLLECTION_NAME = "dpdp_knowledge"
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"

# === Gemini LLM ===
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_FLASH_MODEL = "gemini-2.5-flash"
GEMINI_FLASH_LITE_MODEL = "gemini-2.5-flash-lite"
LLM_MAX_RETRIES = 3
LLM_RETRY_DELAY = 2.0
LLM_TEMPERATURE = 0.1
LLM_MAX_OUTPUT_TOKENS = 4096

# === Rate Limiting ===
MAX_ANALYSES_PER_IP_PER_HOUR = 5
MAX_REQUEST_SIZE_BYTES = 10 * 1024 * 1024

# === Analysis ===
MAX_SCHEMA_FIELDS = 50
MAX_OBLIGATIONS_PER_LLM_CALL = 3
MAX_POLICY_CHUNKS = 3
POLICY_CHUNK_SIZE = 6000
POLICY_CHUNK_OVERLAP = 500

# === Session ===
SESSION_COOKIE_NAME = "dpdp_session_id"
SESSION_COOKIE_MAX_AGE = 30 * 24 * 3600

# === Logging ===
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_DIR = "data/logs"

# === Frontend ===
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# === DPDP Source Documents ===
DPDP_SOURCES_DIR = "data/sources"
