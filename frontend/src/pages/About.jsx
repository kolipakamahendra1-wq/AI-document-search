const stack = [
  ["Frontend", "React, Tailwind, React Router"],
  ["Backend", "FastAPI"],
  ["AI", "LangChain + Ollama (qwen2.5:3b, nomic-embed-text)"],
  ["Vector DB", "FAISS, persisted to disk"],
  ["Deploy", "Docker for the API, Vercel for the frontend"],
];

const diagram = `PDF -> pypdf -> chunks (1000 chars, 150 overlap)
                   |
                   v
        embeddings -> FAISS index (on disk)
                          ^
question -> embed --------+  top-4 similar chunks
                          |
                          v
          LLM answers from context + [n] citations`;

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold">How DocChat works</h1>
      <p className="mt-4 leading-relaxed text-muted">
        DocChat is a retrieval-augmented generation (RAG) app. The language model never sees your whole PDF. It only
        sees the few passages most similar to your question, and it is told to answer from those alone.
      </p>
      <pre className="mt-8 overflow-x-auto rounded-xl border border-line bg-panel p-5 font-mono text-sm leading-relaxed text-accent">
        {diagram}
      </pre>
      <h2 className="mt-12 text-xl font-medium">Stack</h2>
      <dl className="mt-4 divide-y divide-line rounded-xl border border-line bg-panel">
        {stack.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-5 py-3 text-sm">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right">{v}</dd>
          </div>
        ))}
      </dl>
      <h2 className="mt-12 text-xl font-medium">Limits</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted">
        <li>Scanned PDFs without a text layer are rejected (no OCR).</li>
        <li>A 3B local model is fast but can miss details. Check the cited passages.</li>
      </ul>
    </div>
  );
}
