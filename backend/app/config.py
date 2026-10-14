import os

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
CHAT_MODEL = os.getenv("CHAT_MODEL", "qwen2.5:3b")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")
DATA_DIR = os.getenv("DATA_DIR", "data")
FRONTEND_ORIGINS = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").split(",")

CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1000"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "150"))
TOP_K = int(os.getenv("TOP_K", "4"))
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "25"))
