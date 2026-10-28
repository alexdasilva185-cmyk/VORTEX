import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

/**
 * Fuso de Brasília. As páginas do admin são renderizadas no servidor (Vercel,
 * em UTC): sem `timeZone`, "08:34" aparecia no lugar de "05:34".
 */
export const BR_TIMEZONE = "America/Sao_Paulo";

/** "15/10/2026, 05:34:47" no horário de Brasília. */
export function formatDateTimeBR(d: Date | string | number): string {
  return new Date(d).toLocaleString("pt-BR", { timeZone: BR_TIMEZONE });
}

/** Ano, mês (1-12), dia e hora (0-23) de um instante no horário de Brasília. */
export function brDateParts(d: Date | string | number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BR_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(d));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") };
}

/** Meia-noite de hoje em Brasília (UTC-3, sem horário de verão desde 2019). */
export function startOfTodayBR(now: Date = new Date()): Date {
  const { year, month, day } = brDateParts(now);
  return new Date(Date.UTC(year, month - 1, day, 3));
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

export function maskCPF(s: string): string {
  const d = onlyDigits(s).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/** CPF até 11 dígitos; a partir do 12º vira máscara de CNPJ. */
export function maskDocument(s: string): string {
  const d = onlyDigits(s).slice(0, 14);
  if (d.length <= 11) return maskCPF(d);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

/** Digitação de valor em reais: "99850" → "R$ 998,50". Devolve centavos. */
export function parseMoneyInput(s: string): number {
  const d = onlyDigits(s).slice(0, 9);
  return d ? parseInt(d, 10) : 0;
}

export function maskCEP(s: string): string {
  const d = onlyDigits(s).slice(0, 8);
  return d.replace(/(\d{5})(\d)/, "$1-$2");
}

export function maskPhone(s: string): string {
  const d = onlyDigits(s).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d{4})(\d)/, "($1) $2-$3");
  }
  return d.replace(/(\d{2})(\d{5})(\d)/, "($1) $2-$3");
}
