import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CurrencyCode = "INR" | "USD" | "EUR" | "GBP" | "JPY" | "AUD" | "CAD" | "AED";

export type CurrencyInfo = {
  code: CurrencyCode;
  symbol: string;
  country: string;
  flag: string;
  /** Multiplier vs base EUR (seed prices are in EUR) */
  rate: number;
};

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  INR: { code: "INR", symbol: "₹", country: "India", flag: "🇮🇳", rate: 90 },
  USD: { code: "USD", symbol: "$", country: "United States", flag: "🇺🇸", rate: 1.08 },
  EUR: { code: "EUR", symbol: "€", country: "Eurozone", flag: "🇪🇺", rate: 1 },
  GBP: { code: "GBP", symbol: "£", country: "United Kingdom", flag: "🇬🇧", rate: 0.85 },
  JPY: { code: "JPY", symbol: "¥", country: "Japan", flag: "🇯🇵", rate: 165 },
  AUD: { code: "AUD", symbol: "A$", country: "Australia", flag: "🇦🇺", rate: 1.65 },
  CAD: { code: "CAD", symbol: "C$", country: "Canada", flag: "🇨🇦", rate: 1.48 },
  AED: { code: "AED", symbol: "د.إ", country: "UAE", flag: "🇦🇪", rate: 3.97 },
};

type Ctx = {
  currency: CurrencyInfo;
  setCurrency: (c: CurrencyCode) => void;
  format: (eurAmount: number, opts?: { decimals?: number }) => string;
  convert: (eurAmount: number) => number;
};

const CurrencyCtx = createContext<Ctx | null>(null);
const KEY = "smartpantry_currency_v1";

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState<CurrencyCode>("INR");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw && raw in CURRENCIES) setCode(raw as CurrencyCode);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, code);
  }, [code]);

  const currency = CURRENCIES[code];

  const convert = (eur: number) => eur * currency.rate;
  const format = (eur: number, opts?: { decimals?: number }) => {
    const v = convert(eur);
    const decimals = opts?.decimals ?? (currency.code === "JPY" || currency.code === "INR" ? 0 : 2);
    const formatted = v.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return `${currency.symbol}${formatted}`;
  };

  return (
    <CurrencyCtx.Provider value={{ currency, setCurrency: setCode, format, convert }}>
      {children}
    </CurrencyCtx.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyCtx);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}