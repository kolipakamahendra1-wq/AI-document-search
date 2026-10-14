from fastapi.testclient import TestClient
from langchain_core.embeddings import DeterministicFakeEmbedding
from langchain_core.language_models.fake_chat_models import FakeListChatModel

from app import rag
from app.main import create_app


def make_pdf(*pages):
    """Build a minimal valid PDF with one text line per page."""
    objs = ["<< /Type /Catalog /Pages 2 0 R >>", None, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]
    kids = []
    for text in pages:
        stream = f"BT /F1 12 Tf 72 720 Td ({text}) Tj ET"
        objs.append(f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream")
        objs.append(f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents {len(objs)} 0 R "
                    "/Resources << /Font << /F1 3 0 R >> >> >>")
        kids.append(f"{len(objs)} 0 R")
    objs[1] = f"<< /Type /Pages /Kids [{' '.join(kids)}] /Count {len(kids)} >>"
    out, offsets = "%PDF-1.4\n", []
    for i, body in enumerate(objs, 1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n{body}\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n"
    out += "".join(f"{o:010d} 00000 n \n" for o in offsets)
    out += f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF"
    return out.encode()


def client(tmp_path, answers=("The refund window is 30 days [1].",)):
    store = rag.Store(tmp_path, DeterministicFakeEmbedding(size=32), FakeListChatModel(responses=list(answers)))
    return TestClient(create_app(lambda: store)), store


def upload(c, name, *pages):
    return c.post("/api/documents", files=[("files", (name, make_pdf(*pages), "application/pdf"))])


def test_upload_list_chat_delete(tmp_path):
    c, _ = client(tmp_path)
    r = upload(c, "policy.pdf", "Refunds are accepted within 30 days.", "Shipping takes 5 days.")
    assert r.status_code == 201
    doc = r.json()[0]
    assert doc["filename"] == "policy.pdf" and doc["pages"] == 2 and doc["chunks"] == 2
    assert "chunk_ids" not in doc

    assert [d["id"] for d in c.get("/api/documents").json()] == [doc["id"]]

    r = c.post("/api/chat", json={"question": "What is the refund window?"})
    body = r.json()
    assert body["answer"] == "The refund window is 30 days [1]."
    assert {s["page"] for s in body["sources"]} == {1, 2}
    assert body["sources"][0]["filename"] == "policy.pdf"

    assert c.delete(f"/api/documents/{doc['id']}").status_code == 204
    assert c.get("/api/documents").json() == []
    assert c.delete(f"/api/documents/{doc['id']}").status_code == 404


def test_chat_scoped_to_selected_docs(tmp_path):
    c, _ = client(tmp_path)
    a = upload(c, "a.pdf", "Alpha facts").json()[0]
    upload(c, "b.pdf", "Beta facts")
    sources = c.post("/api/chat", json={"question": "facts", "doc_ids": [a["id"]]}).json()["sources"]
    assert sources and all(s["filename"] == "a.pdf" for s in sources)


def test_index_persists_across_restarts(tmp_path):
    c, _ = client(tmp_path)
    upload(c, "a.pdf", "Persistent text")
    c2, store2 = client(tmp_path)
    assert len(c2.get("/api/documents").json()) == 1
    assert c2.post("/api/chat", json={"question": "text"}).json()["sources"]


def test_rejects_bad_input(tmp_path):
    c, _ = client(tmp_path)
    r = c.post("/api/documents", files=[("files", ("notes.txt", b"hi", "text/plain"))])
    assert r.status_code == 400
    r = c.post("/api/documents", files=[("files", ("broken.pdf", b"not a pdf", "application/pdf"))])
    assert r.status_code == 400
    assert c.post("/api/chat", json={"question": ""}).status_code == 422


def test_chat_without_documents(tmp_path):
    c, _ = client(tmp_path)
    body = c.post("/api/chat", json={"question": "anything?"}).json()
    assert body["sources"] == [] and "Upload a PDF" in body["answer"]
