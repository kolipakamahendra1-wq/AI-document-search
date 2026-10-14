const BASE = import.meta.env.VITE_API_URL || "http://localhost:8010";

async function request(path, options) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, options);
  } catch {
    throw new Error("Cannot reach the API. Is the backend running?");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

export const getHealth = () => request("/api/health");
export const listDocs = () => request("/api/documents");
export const deleteDoc = (id) => request(`/api/documents/${id}`, { method: "DELETE" });

export function uploadDocs(files) {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  return request("/api/documents", { method: "POST", body: form });
}

export const sendChat = (question, docIds, history) =>
  request("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, doc_ids: docIds, history }),
  });
