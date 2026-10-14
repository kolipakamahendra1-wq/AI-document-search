import { Link } from "react-router-dom";

const steps = [
  ["01", "Upload", "Drop in one or more PDFs. Text is extracted page by page and split into overlapping chunks."],
  ["02", "Embed", "Each chunk becomes a vector and is stored in a local FAISS index. Nothing leaves your machine."],
  ["03", "Ask", "Your question is matched against the closest chunks and a local LLM answers using only those."],
  ["04", "Verify", "Every answer shows the exact file, page and passage it came from."],
];

export default function Landing() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="grid-bg absolute inset-0" />
        <div className="relative mx-auto max-w-4xl px-4 pb-24 pt-24 text-center">
          <p className="mx-auto mb-6 w-fit rounded-full border border-line bg-panel px-3 py-1 font-mono text-xs text-accent">
            RAG · FAISS · LangChain · runs locally
          </p>
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Ask your documents.<br />
            <span className="text-accent">Get answers with receipts.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
            Upload PDFs and chat with them using semantic search and a local LLM. Every answer cites the page it
            came from, so you can check it.
          </p>
          <div className="mt-10 flex justify-center gap-3">
            <Link to="/chat" className="rounded-lg bg-accent px-5 py-3 font-medium text-ink hover:brightness-110">
              Start chatting
            </Link>
            <Link to="/about" className="rounded-lg border border-line px-5 py-3 text-white hover:bg-white/5">
              How it works
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(([n, title, body]) => (
          <div key={n} className="rounded-xl border border-line bg-panel p-5">
            <span className="font-mono text-xs text-accent">{n}</span>
            <h3 className="mt-3 text-lg font-medium">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
