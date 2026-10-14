import { Route, Routes } from "react-router-dom";
import Nav from "./components/Nav.jsx";
import Landing from "./pages/Landing.jsx";
import Chat from "./pages/Chat.jsx";
import About from "./pages/About.jsx";

export default function App() {
  return (
    <div className="flex h-dvh flex-col">
      <Nav />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </main>
    </div>
  );
}
