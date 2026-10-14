# DocChat - chat with your PDFs

RAG chatbot: upload PDFs, ask questions, get answers that cite file and page.

| Layer | Choice |
|---|---|
| Frontend | React, Tailwind v4, React Router (Vite) |
| Backend | FastAPI |
| AI | LangChain + Ollama (`qwen2.5:3b` chat, `nomic-embed-text` embeddings), free and local |
| Vector DB | FAISS, persisted under `backend/data/` |
| Deploy | Docker (API + web), Vercel (frontend) |

The original spec listed OpenAI and Pinecone. This build uses Ollama and FAISS so it costs nothing.
Models are env-configurable (`CHAT_MODEL`, `EMBED_MODEL`, `OLLAMA_URL`).

## Run locally

```bash
ollama pull qwen2.5:3b && ollama pull nomic-embed-text

# backend (http://localhost:8010)
python -m venv .venv && .venv/Scripts/pip install -r backend/requirements.txt   # Windows
cd backend && ../.venv/Scripts/python -m uvicorn app.main:app --port 8010

# frontend (http://localhost:5173)
cd frontend && npm install && npm run dev
```

Tests (no Ollama needed, uses fake embeddings and a fake LLM): `cd backend && ../.venv/Scripts/python -m pytest`

## Docker

```bash
docker compose up --build   # web on :8080, api on :8010, Ollama must run on the host
```

## Deploy

- **Frontend on Vercel:** root directory `frontend`, env `VITE_API_URL=https://<your-api>`. `vercel.json` handles SPA routing.
- **Backend:** host the Docker image somewhere with a persistent volume (FAISS index) and reachable Ollama. It cannot run on Vercel functions. Set `FRONTEND_ORIGIN` to your Vercel URL.

## API

`GET /api/health` · `GET/POST /api/documents` · `DELETE /api/documents/{id}` · `POST /api/chat {question, doc_ids?, history?}`

## Limits

Scanned PDFs without a text layer are rejected (no OCR). A 3B model can miss details, so check the cited passages.
