import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] grid place-items-center font-figtree">
      <div className="text-center space-y-6">
        <p className="font-fraunces text-8xl font-normal tracking-tighter text-primary">404</p>
        <h1 className="font-fraunces text-2xl font-medium tracking-tight text-foreground/90">This shelf is empty.</h1>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">The page you're looking for has gone the way of last week's lettuce.</p>
        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-md shadow-sm transition-transform active:scale-95">
          <Link to="/">Back to SmartPantry</Link>
        </Button>
      </div>
    </div>
  );
}
