import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollShelfProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function ScrollShelf({ children, className, ...props }: ScrollShelfProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = React.useState(false);
  const [showRight, setShowRight] = React.useState(false);

  const updateArrows = React.useCallback(() => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      // Use a 5px threshold to account for fractional subpixel rendering
      setShowLeft(scrollLeft > 5);
      setShowRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  }, []);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Check initially
    updateArrows();

    // Set up ResizeObserver to update arrows when container or child elements change sizes
    const resizeObserver = new ResizeObserver(() => {
      updateArrows();
    });
    resizeObserver.observe(el);

    // Observe children as well in case items are dynamically loaded
    const childrenList = el.children;
    for (let i = 0; i < childrenList.length; i++) {
      resizeObserver.observe(childrenList[i]);
    }

    // Set up MutationObserver to watch for additions/deletions of children
    const mutationObserver = new MutationObserver(() => {
      updateArrows();
      // Re-observe any new children
      for (let i = 0; i < el.children.length; i++) {
        resizeObserver.observe(el.children[i]);
      }
    });
    mutationObserver.observe(el, { childList: true });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [updateArrows, children]);

  const handleScroll = (direction: "left" | "right") => {
    if (containerRef.current) {
      const { clientWidth } = containerRef.current;
      // Scroll by 80% of clientWidth for optimal paging
      const scrollAmount = clientWidth * 0.8;
      containerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="relative group/shelf w-full">
      {/* Left Navigation Chevron */}
      {showLeft && (
        <button
          type="button"
          onClick={() => handleScroll("left")}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm border border-border/80 text-foreground hover:bg-background hover:text-primary transition-all shadow-lg hover:scale-105 active:scale-95 duration-200 flex items-center justify-center cursor-pointer opacity-0 group-hover/shelf:opacity-100 focus-visible:opacity-100"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5.5 w-5.5" />
        </button>
      )}

      {/* Scrollable container */}
      <div
        ref={containerRef}
        onScroll={updateArrows}
        className={cn(
          "flex gap-6 overflow-x-auto pb-4 pt-1 no-scrollbar snap-x scroll-smooth",
          className
        )}
        {...props}
      >
        {children}
      </div>

      {/* Right Navigation Chevron */}
      {showRight && (
        <button
          type="button"
          onClick={() => handleScroll("right")}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm border border-border/80 text-foreground hover:bg-background hover:text-primary transition-all shadow-lg hover:scale-105 active:scale-95 duration-200 flex items-center justify-center cursor-pointer opacity-0 group-hover/shelf:opacity-100 focus-visible:opacity-100"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5.5 w-5.5" />
        </button>
      )}
    </div>
  );
}
