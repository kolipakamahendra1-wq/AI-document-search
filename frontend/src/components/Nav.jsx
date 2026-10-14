import { Link, NavLink } from "react-router-dom";

const link = ({ isActive }) =>
  `rounded-md px-3 py-1.5 text-sm transition-colors ${
    isActive ? "bg-white/10 text-white" : "text-muted hover:text-white"
  }`;

export default function Nav() {
  return (
    <header className="border-b border-line bg-ink/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="grid size-6 place-items-center rounded-md bg-accent text-xs font-bold text-ink">D</span>
          DocChat
        </Link>
        <nav className="flex items-center gap-1">
          <NavLink to="/" end className={link}>Home</NavLink>
          <NavLink to="/about" className={link}>How it works</NavLink>
          <Link to="/chat" className="ml-2 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-ink hover:brightness-110">
            Open app
          </Link>
        </nav>
      </div>
    </header>
  );
}
