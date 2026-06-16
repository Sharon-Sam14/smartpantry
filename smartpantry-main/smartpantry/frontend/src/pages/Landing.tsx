import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ChefHat, Sparkles, TrendingUp, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/lib/currency";
import heroImg from "@/assets/hero-pantry.jpg";

const features = [
  { icon: Leaf, title: "Expiry-aware pantry", desc: "Track every jar, bunch and bottle. We surface what to cook before it turns." },
  { icon: ChefHat, title: "Ranked recipes", desc: "A score that blends what you own, what's fading, and what you actually love." },
  { icon: TrendingUp, title: "Spend forecasts", desc: "Lightweight ML predicts next month's grocery bill from your trend." },
  { icon: Sparkles, title: "Personalised", desc: "Diet, dislikes, and cuisine taste shape every suggestion." },
];

export default function Landing() {
  const { format } = useCurrency();
  return (
    <div className="overflow-hidden font-figtree">
      {/* HERO */}
      <section className="relative">
        <div className="container grid lg:grid-cols-2 gap-12 items-center pt-16 pb-24 lg:pt-24 lg:pb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-7"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-2)]" /> A quieter way to cook
            </span>
            <h1 className="font-fraunces text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight leading-[1.08] text-balance text-foreground">
              Cook what you have, <span className="font-fraunces italic font-normal text-primary">before it's gone.</span>
            </h1>
            <p className="text-base text-muted-foreground max-w-xl text-balance">
              SmartPantry tracks every ingredient in your kitchen, ranks recipes by what's about to expire,
              and forecasts your weekly spend — all in a clean, minimalist space made for home cooks.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm rounded-md text-sm font-medium h-11 px-6 transition-transform active:scale-95">
                <Link to="/auth">
                  Start your pantry <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-md text-sm font-medium h-11 px-6 border-border/80 hover:bg-muted/50">
                <Link to="/recipes">Browse recipes</Link>
              </Button>
            </div>
            <dl className="flex gap-8 pt-4 border-t border-border/40">
              <div>
                <dt className="text-2xl font-fraunces font-normal tracking-tight text-foreground/90 font-tabular">42%</dt>
                <dd className="label-category text-muted-foreground mt-0.5">less food waste</dd>
              </div>
              <div>
                <dt className="text-2xl font-fraunces font-normal tracking-tight text-foreground/90 font-tabular">12 min</dt>
                <dd className="label-category text-muted-foreground mt-0.5">avg meal plan</dd>
              </div>
              <div>
                <dt className="text-2xl font-fraunces font-normal tracking-tight text-foreground/90 font-tabular">{format(38)}</dt>
                <dd className="label-category text-muted-foreground mt-0.5">saved per week</dd>
              </div>
            </dl>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-secondary/40 rounded-3xl -rotate-1" aria-hidden />
            <img
              src={heroImg}
              alt="Clean visual layout of fresh bread, herbs, and ingredients"
              width={1600}
              height={1200}
              className="relative rounded-2xl shadow-elegant object-cover aspect-[4/3] border border-border/30"
            />
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-4 -left-4 bg-card rounded-xl p-4 shadow-elegant border border-border max-w-[220px]"
            >
              <p className="label-category text-muted-foreground">Expiring tomorrow</p>
              <p className="font-fraunces text-sm font-medium text-foreground/90 mt-1">Spinach · 1 bunch</p>
              <p className="text-xs text-[var(--accent-2)] font-semibold mt-2">→ 3 recipes ready to cook</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-t border-border/60 bg-card/45">
        <div className="container py-20">
          <div className="max-w-2xl mb-14 space-y-2">
            <p className="label-category text-[var(--accent-2)]">The pantry, reimagined</p>
            <h2 className="font-fraunces text-3xl md:text-4xl font-normal tracking-tight text-balance text-foreground/90">
              Less waste. Better dinners. A kitchen that thinks ahead.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-6 shadow-sm hover:border-border/80 transition-smooth"
              >
                <div className="h-9 w-9 rounded-lg bg-[var(--accent-2)]/10 grid place-items-center mb-4 text-[var(--accent-2)]">
                  <f.icon className="h-4.5 w-4.5" />
                </div>
                <h3 className="font-fraunces text-sm font-medium text-foreground/95 mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container py-20">
        <div className="grid lg:grid-cols-3 gap-10 items-start">
          {[
            { n: "01", t: "Stock your pantry", d: "Add what you bought, with expiry dates and prices." },
            { n: "02", t: "Get ranked recipes", d: "Our model scores meals by coverage, urgency, and your taste." },
            { n: "03", t: "Track and predict", d: "See your spend trend and a 4-week forecast." },
          ].map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="space-y-3"
            >
              <p className="font-fraunces text-5xl font-normal tracking-tighter text-primary">{s.n}</p>
              <h3 className="font-fraunces text-base font-medium tracking-tight text-foreground/90 mt-1">{s.t}</h3>
              <p className="text-xs text-muted-foreground leading-normal">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20">
        <div className="rounded-2xl bg-gradient-to-br from-[#2E2720] to-[#1E1A15] text-[#FAF7F2] p-12 md:p-16 border border-[var(--border-color)] shadow-elegant relative overflow-hidden">
          {/* Subtle grain overlay for branding sidebar */}
          <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(200,98,42,0.05)_1.5px,transparent_1.5px)] bg-[size:24px_24px] pointer-events-none" />

          <div className="relative max-w-2xl space-y-4 z-10">
            <h2 className="font-fraunces text-3xl md:text-4xl font-normal tracking-tight text-balance text-[#FAF7F2]">
              Your kitchen is ready. Are you?
            </h2>
            <p className="text-sm opacity-90 font-figtree">Start free with sample data — no credit card, no fluff.</p>
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-md shadow-sm mt-4 text-xs font-medium px-6 h-10 transition-transform active:scale-95">
              <Link to="/auth">Open SmartPantry <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
