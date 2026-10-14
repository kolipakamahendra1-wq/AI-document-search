from typing import Literal

import httpx
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import config, rag


class Turn(BaseModel):
    role: Literal["human", "ai"]
    content: str


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    doc_ids: list[str] | None = None
    history: list[Turn] = []


def create_app(store_factory=None):
    store_factory = store_factory or (
        lambda: rag.Store(config.DATA_DIR, rag.make_embeddings(), rag.make_llm())
    )
    app = FastAPI(title="DocChat API")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.FRONTEND_ORIGINS,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    state = {}

    def store():
        if "store" not in state:
            state["store"] = store_factory()
        return state["store"]

    @app.get("/api/health")
    def health():
        try:
            httpx.get(f"{config.OLLAMA_URL}/api/tags", timeout=2).raise_for_status()
            ollama = True
        except httpx.HTTPError:
            ollama = False
        return {"ok": True, "ollama": ollama, "chat_model": config.CHAT_MODEL}

    @app.get("/api/documents")
    def list_documents():
        return store().list()

    @app.post("/api/documents", status_code=201)
    def upload(files: list[UploadFile]):
        added = []
        for f in files:
            if not (f.filename or "").lower().endswith(".pdf"):
                raise HTTPException(400, f"{f.filename}: only PDF files are supported")
            data = f.file.read()
            if len(data) > config.MAX_UPLOAD_MB * 1024 * 1024:
                raise HTTPException(413, f"{f.filename}: larger than {config.MAX_UPLOAD_MB} MB")
            try:
                added.append(store().add_pdf(f.filename, data))
            except ValueError as exc:
                raise HTTPException(400, f"{f.filename}: {exc}")
        return added

    @app.delete("/api/documents/{doc_id}", status_code=204)
    def delete(doc_id: str):
        try:
            store().delete(doc_id)
        except KeyError:
            raise HTTPException(404, "Document not found")

    @app.post("/api/chat")
    def chat(req: ChatRequest):
        try:
            return store().ask(req.question, req.doc_ids, [t.model_dump() for t in req.history])
        except httpx.HTTPError as exc:
            raise HTTPException(503, f"LLM unavailable: {exc}")

    return app


app = create_app()
