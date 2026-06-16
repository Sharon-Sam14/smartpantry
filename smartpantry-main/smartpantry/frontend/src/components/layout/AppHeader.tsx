import { Leaf, Moon, Sun, LogOut } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { useStore } from "@/lib/store";
import { CurrencyPicker } from "@/components/CurrencyPicker";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/pantry", label: "Pantry" },
  { to: "/recipes", label: "Recipes" },
  { to: "/shopping", label: "Shopping List" },
  { to: "/insights", label: "Analytics" },
];

export function AppHeader() {
  const { theme, toggle } = useTheme();
  const { auth, signOut, backendOnline } = useStore();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-[24px] shadow-sm transition-all duration-300">
      <div className="container flex h-20 items-center justify-between gap-6">
        {/* Flagship Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <span className="text-primary transition-transform duration-300 group-hover:scale-95">
            <Leaf className="h-6 w-6 fill-current" />
          </span>
          <span className="font-fraunces text-2xl font-bold tracking-tight text-[var(--text-1)]">
            SmartPantry
          </span>
        </Link>

        {/* Premium Desktop Navigation */}
        {auth.isAuthed && (
          <nav className="hidden md:flex items-center gap-8 relative">
            {navItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cn(
                    "px-2 py-3 text-[19px] font-bold tracking-wide font-figtree relative flex items-center justify-center transition-all duration-300 hover:-translate-y-0.5",
                    isActive
                      ? "text-primary"
                      : "text-[var(--text-2)] hover:text-[var(--text-1)]"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative z-10">{n.label}</span>
                    {isActive && (
                      <motion.span
                        layoutId="activeNavUnderline"
                        className="absolute bottom-0 left-1 right-1 h-[3.5px] bg-primary rounded-full z-0 shadow-[0_2px_8px_rgba(200,107,60,0.45)] dark:shadow-[0_2px_8px_rgba(217,120,66,0.45)]"
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        )}

        {/* Header Right Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Connection Status indicator */}
          <span
            title={backendOnline ? "Django backend connected" : "Backend offline — using local demo data"}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground mr-1"
          >
            <span className={cn(
              "h-1.5 w-1.5 rounded-full relative flex",
              backendOnline ? "bg-[#5A7A50] dark:bg-[#7A9270]" : "bg-neutral-400"
            )}>
              {backendOnline && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5A7A50] dark:bg-[#7A9270] opacity-75" />
              )}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider font-figtree">
              {backendOnline ? "API live" : "Demo mode"}
            </span>
          </span>
          
          <CurrencyPicker compact />
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 hover:bg-secondary/60 rounded-md text-[var(--text-2)] hover:text-[var(--text-1)] transition-all duration-200" 
            onClick={toggle} 
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </Button>

          {auth.isAuthed ? (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-9 text-xs hover:bg-secondary/60 rounded-md font-figtree font-medium" 
              onClick={() => { signOut(); navigate("/"); }}
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /> Sign out
            </Button>
          ) : (
            <Button asChild size="sm" className="h-9 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-figtree font-semibold">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
