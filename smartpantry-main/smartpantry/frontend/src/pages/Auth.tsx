import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { API_BASE } from "@/lib/api";

export default function Auth() {
  const { signIn, signUp, backendOnline } = useStore();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast({ title: "Email and password required", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        await signUp(email, password);
        toast({ title: "Account created — welcome!" });
      } else {
        await signIn(email, password);
        toast({ title: "Welcome back" });
      }
      navigate("/dashboard");
    } catch (err: any) {
      const msg = String(err?.message || "");
      const is400 = err?.status === 400 || msg.includes("400");
      const friendly = is400
        ? mode === "signup"
          ? "Could not sign up. Email may already be in use."
          : "Invalid email or password."
        : `Backend unreachable. Make sure Django is running at ${API_BASE}`;
      toast({ title: "Sign-in failed", description: friendly, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container max-w-6xl py-12 lg:py-24 font-figtree">
      <div className="grid lg:grid-cols-12 rounded-[2.5rem] overflow-hidden border border-[var(--border-color)] bg-[var(--bg-2)] shadow-elegant min-h-[640px]">
        {/* Left Side Premium Panel - Food Art & Texture */}
        <div 
          className="relative lg:col-span-5 text-[#FAF7F2] p-10 lg:p-14 hidden lg:flex flex-col justify-between overflow-hidden bg-cover bg-center"
          style={{ backgroundImage: `url('/images/fresh_ingredients.png')` }}
        >
          {/* Rich Ambient Gradient Mask Layer for high contrast text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F0D0B]/85 via-[#0F0D0B]/90 to-[#0F0D0B] z-0" />
          {/* Subtle noise grain texture overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(200,107,60,0.12)_1.5px,transparent_1.5px)] bg-[size:32px_32px] opacity-75 pointer-events-none z-1" />
          {/* Radial Warm Glow behind title */}
          <div className="absolute top-[20%] left-[10%] w-72 h-72 rounded-full bg-[var(--accent)]/15 blur-[80px] pointer-events-none z-1" />

          <div className="relative z-10 space-y-4">
            <span className="label-category text-[var(--accent-gold)] tracking-widest text-xs border-b border-[var(--accent-gold)]/30 pb-1">
              {mode === "signup" ? "Join SmartPantry" : "Welcome Back"}
            </span>
            <h1 className="font-fraunces text-4.5xl font-normal tracking-tight mt-6 leading-tight">
              A pantry that knows <span className="italic text-[var(--accent-gold)]">your kitchen.</span>
            </h1>
            <p className="text-[#ECE6DA]/70 text-sm max-w-sm font-figtree mt-2">
              Transform ingredients into culinary art. Reduce waste, track fresh produce, and generate Michelin-star inspired recipes automatically.
            </p>
          </div>

          <blockquote className="font-fraunces text-lg font-normal italic opacity-95 border-l-3 border-[var(--accent)] pl-5 leading-normal relative z-10">
            "I haven't thrown out spinach in three months."
            <footer className="font-figtree not-italic text-xs mt-2 text-[#ECE6DA]/70 font-semibold tracking-wide">— Mara, home cook</footer>
          </blockquote>
        </div>

        {/* Right Side Credentials Card Container */}
        <div className="lg:col-span-7 p-6 lg:p-16 flex items-center justify-center relative bg-[var(--bg)]">
          {/* Outer Ambient Glow Behind Floating Card */}
          <div className="absolute inset-16 rounded-[2rem] bg-[var(--accent)]/5 blur-3xl pointer-events-none z-0" />

          {/* Stacking Card Shadow Mockups (Linear/Apple feel) */}
          <div className="absolute inset-x-8 lg:inset-x-20 top-12 bottom-12 rounded-[2rem] border border-[var(--border-color)] bg-card/40 transform rotate-1 scale-[0.98] translate-x-2 translate-y-2 pointer-events-none z-0" />
          <div className="absolute inset-x-8 lg:inset-x-20 top-12 bottom-12 rounded-[2rem] border border-[var(--border-color)] bg-card/70 transform -rotate-1 scale-[0.99] -translate-x-1.5 translate-y-1 pointer-events-none z-0" />

          {/* Main Credentials Card */}
          <div className="relative z-10 w-full max-w-md bg-card border border-[var(--border-color)] rounded-[2rem] p-8 lg:p-12 shadow-elegant">
            <AnimatePresence mode="wait">
              <motion.form
                key={mode}
                onSubmit={submit}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="font-fraunces text-3xl font-normal tracking-tight text-foreground">
                    {mode === "signup" ? "Create account" : "Welcome back"}
                  </h2>
                  <p className="text-muted-foreground text-sm mt-2">
                    {mode === "signup"
                      ? "Enter your details to register and start managing your pantry."
                      : "Enter your credentials to access your smart kitchen."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[var(--bg-2)] border border-[var(--border-color)]/20">
                  {(["signin", "signup"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`rounded-lg py-2 text-sm font-semibold transition-all duration-300 ${
                        mode === m 
                          ? "bg-card shadow-md text-[var(--accent)] border border-[var(--border-color)]/20 scale-[1.02]" 
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m === "signin" ? "Sign in" : "Sign up"}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold text-[var(--text-2)] tracking-wide uppercase">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--accent)]/70" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@kitchen.co"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 pl-11 bg-background/50 border border-[var(--border-color)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all rounded-xl placeholder:text-muted-foreground/60 text-[15px]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pwd" className="text-xs font-bold text-[var(--text-2)] tracking-wide uppercase">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--accent)]/70" />
                    <Input
                      id="pwd"
                      type="password"
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 pl-11 bg-background/50 border border-[var(--border-color)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all rounded-xl placeholder:text-muted-foreground/60 text-[15px]"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={busy}
                  className="w-full h-12 bg-gradient-to-r from-[var(--accent)] to-[#e28353] dark:to-[#eb8e5e] hover:opacity-95 text-white font-bold rounded-xl shadow-lg shadow-[var(--accent)]/15 hover:shadow-[var(--accent)]/35 mt-2 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 active:translate-y-0"
                >
                  {busy ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
                </Button>

                <p className="text-[10px] text-center text-muted-foreground font-mono bg-[var(--bg-2)]/50 py-1.5 rounded-lg border border-[var(--border-color)]/10">
                  {backendOnline
                    ? "✓ Connected to Django API Backend"
                    : "⚠️ Demo mode — API unreachable"}
                </p>
              </motion.form>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
