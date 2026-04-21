import { Link, NavLink, useNavigate } from "react-router-dom";
import { Bell, LogOut, Plus, Sliders, User as UserIcon } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 text-xs uppercase tracking-[0.2em] transition-colors border ${
      isActive
        ? "border-neon-cyan text-neon-cyan shadow-[0_0_12px_hsl(var(--neon-cyan)/0.4)]"
        : "border-transparent text-muted-foreground hover:text-neon-cyan hover:border-neon-cyan/40"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-neon-cyan/30 bg-background/80 backdrop-blur-md">
      <div className="container flex h-14 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-sm md:text-base">
          <span className="neon-text-cyan glitch">VECTOR_NOIR</span>
          <span className="text-muted-foreground">//</span>
          <span className="neon-text-magenta hidden sm:inline">FLASH_SYSTEM</span>
        </Link>

        <nav className="hidden md:flex items-center gap-2">
          <NavLink to="/" end className={linkClass}>All_Courses</NavLink>
          {user && <NavLink to="/my-courses" className={linkClass}>My_Courses</NavLink>}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button
                variant="cyber"
                size="sm"
                onClick={() => navigate("/courses/new")}
                className="hidden sm:inline-flex"
              >
                <Plus className="mr-1 h-4 w-4" /> New_Deck
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 border border-neon-magenta/60 px-2 py-1 hover:shadow-[0_0_12px_hsl(var(--neon-magenta)/0.5)]">
                    <div className="h-7 w-7 grid place-items-center bg-neon-magenta/20 text-neon-magenta">
                      <UserIcon className="h-4 w-4" />
                    </div>
                    <span className="hidden sm:inline text-xs uppercase tracking-widest text-neon-magenta">
                      {user.name}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="border-neon-cyan/40 bg-card">
                  <DropdownMenuLabel className="text-xs uppercase tracking-widest text-muted-foreground">
                    {user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <Sliders className="mr-2 h-4 w-4" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="text-neon-red">
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                Login
              </Button>
              <Button variant="cyber" size="sm" onClick={() => navigate("/signup")}>
                Sign_Up
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="md:hidden flex items-center gap-2 px-4 pb-2 overflow-x-auto">
        <NavLink to="/" end className={linkClass}>All_Courses</NavLink>
        {user && <NavLink to="/my-courses" className={linkClass}>My_Courses</NavLink>}
      </nav>
    </header>
  );
}
