import { Outlet } from "react-router-dom";
import { Header } from "./Header";

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col scanlines">
      <Header />
      <main className="flex-1 container py-8 animate-fade-in">
        <Outlet />
      </main>
      <footer className="border-t border-neon-cyan/20 bg-background/60 backdrop-blur">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-2 py-4 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          <span>© 2026 the_vector_noir_protocol // cognitive_enhancement</span>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 bg-neon-green shadow-[0_0_8px_hsl(var(--neon-green))]" />
            <span className="text-neon-green">neural_link_stable</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
