import { Outlet } from "react-router-dom";
import { AppHeader } from "./AppHeader";

export default function AppShell() {
  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Editorial Ambient Vignettes & Grain Overlay */}
      <div 
        className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none z-0" 
        style={{
          background: 'radial-gradient(circle, rgba(200, 98, 42, 0.08) 0%, rgba(200, 98, 42, 0) 70%)'
        }}
      />
      <div 
        className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none z-0" 
        style={{
          background: 'radial-gradient(circle, rgba(184, 148, 58, 0.05) 0%, rgba(184, 148, 58, 0) 70%)'
        }}
      />
      
      {/* Static Noise Grain (Mix-blend overlay for organic texture) */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.06] mix-blend-overlay" style={{
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`
      }} />

      {/* Light Mode Edge Vignette */}
      <div className="absolute inset-0 pointer-events-none z-0 dark:hidden" style={{
        background: 'radial-gradient(circle, transparent 50%, rgba(28, 24, 20, 0.04) 100%)'
      }} />

      <AppHeader />
      <main className="flex-1 z-10 relative">
        <Outlet />
      </main>
      <footer className="border-t border-border/50 py-6 text-center text-xs text-muted-foreground z-10 bg-card/30">
        <div className="container font-medium tracking-tight font-figtree">SmartPantry · Cook with intention.</div>
      </footer>
    </div>
  );
}
