"""PDF ingestion, FAISS retrieval and grounded answering."""
import json
import threading
import uuid
from io import BytesIO
from pathlib import Path

from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader

from . import config

SYSTEM_PROMPT = (
    "You answer questions about the user's documents. Use ONLY the numbered context "
    "passages provided. Cite passages inline like [1] or [2]. If the context does not "
    "contain the answer, say you couldn't find it in the documents. Be concise."
)


def make_embeddings():
    from langchain_ollama import OllamaEmbeddings

    return OllamaEmbeddings(model=config.EMBED_MODEL, base_url=config.OLLAMA_URL)


def make_llm():
    from langchain_ollama import ChatOllama

    return ChatOllama(model=config.CHAT_MODEL, base_url=config.OLLAMA_URL, temperature=0.1)


class Store:
    def __init__(self, data_dir, embeddings, llm):
        self.dir = Path(data_dir)
        self.dir.mkdir(parents=True, exist_ok=True)
        self.embeddings = embeddings
        self.llm = llm
        self.lock = threading.Lock()
        self.manifest = self.dir / "documents.json"
        self.index_dir = self.dir / "index"
        self.docs = json.loads(self.manifest.read_text()) if self.manifest.exists() else {}
        self.index = None
        if (self.index_dir / "index.faiss").exists():
            self.index = FAISS.load_local(
                str(self.index_dir), embeddings, allow_dangerous_deserialization=True
            )
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=config.CHUNK_SIZE, chunk_overlap=config.CHUNK_OVERLAP
        )

    def _save(self):
        if self.index is not None:
            self.index.save_local(str(self.index_dir))
        self.manifest.write_text(json.dumps(self.docs, indent=2))

    @staticmethod
    def _public(doc):
        return {k: v for k, v in doc.items() if k != "chunk_ids"}

    def list(self):
        return [self._public(d) for d in self.docs.values()]

    def add_pdf(self, filename, data):
        try:
            reader = PdfReader(BytesIO(data))
            texts = [page.extract_text() or "" for page in reader.pages]
        except Exception as exc:
            raise ValueError(f"Could not read PDF: {exc}") from exc

        doc_id = uuid.uuid4().hex[:12]
        pages = [
            Document(page_content=text, metadata={"doc_id": doc_id, "filename": filename, "page": i + 1})
            for i, text in enumerate(texts)
            if text.strip()
        ]
        if not pages:
            raise ValueError("No extractable text (scanned PDFs need OCR first).")

        chunks = self.splitter.split_documents(pages)
        ids = [uuid.uuid4().hex for _ in chunks]
        with self.lock:
            if self.index is None:
                self.index = FAISS.from_documents(chunks, self.embeddings, ids=ids)
            else:
                self.index.add_documents(chunks, ids=ids)
            self.docs[doc_id] = {
                "id": doc_id,
                "filename": filename,
                "pages": len(texts),
                "chunks": len(chunks),
                "chunk_ids": ids,
            }
            self._save()
        return self._public(self.docs[doc_id])

    def delete(self, doc_id):
        with self.lock:
            doc = self.docs.pop(doc_id)  # KeyError -> 404 in the API
            self.index.delete(doc["chunk_ids"])
            self._save()

    def ask(self, question, doc_ids=None, history=None):
        if not self.docs:
            return {"answer": "Upload a PDF first, then ask me about it.", "sources": []}

        allowed = set(doc_ids or self.docs)
        hits = self.index.similarity_search_with_score(
            question, k=config.TOP_K, fetch_k=50, filter=lambda md: md["doc_id"] in allowed
        )
        if not hits:
            return {"answer": "I couldn't find anything relevant in the selected documents.", "sources": []}

        context = "\n\n".join(
            f"[{i}] ({d.metadata['filename']}, page {d.metadata['page']})\n{d.page_content}"
            for i, (d, _) in enumerate(hits, 1)
        )
        messages = [("system", SYSTEM_PROMPT)]
        messages += [(m["role"], m["content"]) for m in (history or [])[-6:]]
        messages.append(("human", f"Context:\n{context}\n\nQuestion: {question}"))
        answer = self.llm.invoke(messages).content

        sources = [
            {
                "n": i,
                "doc_id": d.metadata["doc_id"],
                "filename": d.metadata["filename"],
                "page": d.metadata["page"],
                "snippet": d.page_content[:300],
                "distance": round(float(score), 4),
            }
            for i, (d, score) in enumerate(hits, 1)
        ]
        return {"answer": answer, "sources": sources}
