import { useCallback, useEffect, useRef, useState } from "react";
import { deleteDoc, getHealth, listDocs, sendChat, uploadDocs } from "../api.js";

function Sources({ sources }) {
  if (!sources?.length) return null;
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-muted hover:text-white">
        {sources.length} sources
      </summary>
      <ul className="mt-2 space-y-2">
        {sources.map((s) => (
          <li key={s.n} className="rounded-lg border border-line bg-ink p-3">
            <div className="mb-1 font-mono text-xs text-accent">
              [{s.n}] {s.filename} · page {s.page}
            </div>
            <p className="text-muted">{s.snippet}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}

export default function Chat() {
  const [docs, setDocs] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [ollama, setOllama] = useState(true);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef(null);
  const bottom = useRef(null);

  const refresh = useCallback(async () => {
    const list = await listDocs();
    setDocs(list);
    setSelected((prev) => new Set([...prev].filter((id) => list.some((d) => d.id === id))));
  }, []);

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
    getHealth()
      .then((h) => setOllama(h.ollama))
      .catch(() => {});
  }, [refresh]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function handleFiles(fileList) {
    const files = [...fileList];
    if (!files.length) return;
    setError("");
    setUploading(true);
    try {
      const added = await uploadDocs(files);
      await refresh();
      setSelected((prev) => new Set([...prev, ...added.map((d) => d.id)]));
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function remove(id) {
    setError("");
    try {
      await deleteDoc(id);
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function ask(e) {
    e.preventDefault();
    const question = input.trim();
    if (!question || busy) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: "human", content: question }]);
    setInput("");
    setError("");
    setBusy(true);
    try {
      const res = await sendChat(question, selected.size ? [...selected] : null, history);
      setMessages((m) => [...m, { role: "ai", content: res.answer, sources: res.sources }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col gap-4 p-4 md:flex-row">
      <aside className="w-full shrink-0 space-y-4 md:w-72">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInput.current?.click()}
          className={`cursor-pointer rounded-xl border border-dashed p-6 text-center text-sm transition-colors ${
            dragging ? "border-accent bg-accent/10" : "border-line bg-panel hover:border-muted"
          }`}
        >
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            hidden
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          {uploading ? (
            <span className="text-accent">Reading and indexing…</span>
          ) : (
            <>
              <div className="font-medium">Drop PDFs here</div>
              <div className="mt-1 text-muted">or click to browse</div>
            </>
          )}
        </div>

        <div className="rounded-xl border border-line bg-panel">
          <div className="border-b border-line px-4 py-2 font-mono text-xs uppercase tracking-wide text-muted">
            Documents ({docs.length})
          </div>
          {docs.length === 0 ? (
            <p className="p-4 text-sm text-muted">No documents yet.</p>
          ) : (
            <ul className="max-h-72 divide-y divide-line overflow-y-auto">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.has(d.id)}
                    onChange={() => toggle(d.id)}
                    aria-label={`Search in ${d.filename}`}
                    className="accent-[#7cf5c4]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{d.filename}</div>
                    <div className="text-xs text-muted">{d.pages} pages · {d.chunks} chunks</div>
                  </div>
                  <button
                    onClick={() => remove(d.id)}
                    className="text-muted hover:text-red-400"
                    aria-label={`Delete ${d.filename}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-xs text-muted">
          {selected.size ? `Searching ${selected.size} selected` : "Searching all documents"}
        </p>
      </aside>

      <section className="flex min-h-[28rem] min-w-0 flex-1 flex-col rounded-xl border border-line bg-panel">
        {!ollama && (
          <div className="border-b border-line bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
            Ollama is not reachable. Start it with <code className="font-mono">ollama serve</code>.
          </div>
        )}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="grid h-full place-items-center text-center text-muted">
              <div>
                <p className="text-lg text-white">Ask anything about your PDFs</p>
                <p className="mt-1 text-sm">Upload a document, then ask a question.</p>
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "human" ? "flex justify-end" : "flex"}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  m.role === "human" ? "bg-accent text-ink" : "border border-line bg-ink"
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                <Sources sources={m.sources} />
              </div>
            </div>
          ))}
          {busy && <div className="text-sm text-muted">Searching documents and thinking…</div>}
          <div ref={bottom} />
        </div>

        {error && (
          <div role="alert" className="border-t border-line bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
        <form onSubmit={ask} className="flex gap-2 border-t border-line p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={docs.length ? "Ask a question…" : "Upload a PDF first"}
            className="flex-1 rounded-lg border border-line bg-ink px-4 py-2.5 outline-none placeholder:text-muted focus:border-accent"
          />
          <button
            disabled={busy || !input.trim()}
            className="rounded-lg bg-accent px-5 font-medium text-ink disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </section>
    </div>
  );
}
