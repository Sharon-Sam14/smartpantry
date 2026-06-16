import { Globe } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCIES, useCurrency, type CurrencyCode } from "@/lib/currency";

export function CurrencyPicker({ compact = false }: { compact?: boolean }) {
  const { currency, setCurrency } = useCurrency();

  return (
    <Select value={currency.code} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
      <SelectTrigger
        className={compact ? "h-9 w-[110px] text-xs" : "h-10 w-[170px]"}
        aria-label="Select country and currency"
      >
        <Globe className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
        <SelectValue>
          <span className="inline-flex items-center gap-1.5">
            <span>{currency.flag}</span>
            <span className="font-medium">{currency.symbol}</span>
            {!compact && <span className="text-muted-foreground text-xs">{currency.code}</span>}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.values(CURRENCIES).map((c) => (
          <SelectItem key={c.code} value={c.code}>
            <span className="inline-flex items-center gap-2">
              <span>{c.flag}</span>
              <span className="font-medium">{c.country}</span>
              <span className="text-muted-foreground text-xs">{c.symbol} {c.code}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}