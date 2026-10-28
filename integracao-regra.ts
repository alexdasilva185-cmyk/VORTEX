// Regras puras da API de integração (rotas /api/integracao/*), usada por um CRM ou outro sistema seu pra
// listar produtos, criar ofertas com preço próprio e buscar pedidos. Sem import de "@/": os testes rodam no node.
import { createHash, timingSafeEqual } from "node:crypto";

/** Menor preço (em centavos) que a integração aceita criar quando INTEGRACAO_MINIMO_CENTAVOS não está definida: R$ 1,00. */
export const MINIMO_PADRAO = 100;
const CHAVE_VALIDA = /^[A-Za-z0-9_-]{40,}$/;
const sha = (v: string) => createHash("sha256").update(v).digest();

/** Confere `Authorization: Bearer <chave>` em tempo constante. Chave ausente ou fraca: nada passa. */
export function chaveConfere(header: string | null, chave: string | undefined): boolean {
  if (!header || !chave || !CHAVE_VALIDA.test(chave)) return false;
  return timingSafeEqual(sha(header), sha(`Bearer ${chave}`));
}

/** Piso de preço das ofertas criadas pela integração. Valor inválido ou abaixo de R$ 1,00 cai no padrão. */
export function minimoCentavos(v: string | undefined): number {
  const n = Number(v);
  return v !== undefined && v.trim() !== "" && Number.isInteger(n) && n >= MINIMO_PADRAO ? n : MINIMO_PADRAO;
}

const SEPARADOR = " · ";

/** "Ana · R$ 1.497 · 23/10" (autor = quem pediu a oferta; data em Brasília). Até 80 caracteres, o limite do admin. */
export function nomeDaOferta(autor: string, valorCentavos: number, quando: Date): string {
  const reais = (valorCentavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: valorCentavos % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  });
  const data = quando.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
  return `${autor.trim().slice(0, 30)}${SEPARADOR}R$ ${reais}${SEPARADOR}${data}`.slice(0, 80);
}

export const ehDaIntegracao = (nome: string, autor: string) => nome.startsWith(`${autor.trim().slice(0, 30)}${SEPARADOR}`);

const digitos = (s: string) => (s || "").replace(/\D/g, "");

/** Compara pelos 8 últimos dígitos: ignora DDI, DDD com ou sem 0 e o 9 do celular. */
export function telefoneCasa(armazenado: string, buscado: string): boolean {
  const a = digitos(armazenado);
  const b = digitos(buscado);
  return a.length >= 8 && b.length >= 8 && a.slice(-8) === b.slice(-8);
}

export function lerBusca(q: string): { tipo: "telefone"; digitos: string } | { tipo: "texto"; texto: string } | null {
  const t = (q || "").trim();
  const d = digitos(t);
  if (d.length >= 8 && d.length >= t.replace(/\s/g, "").length - 4) return { tipo: "telefone", digitos: d };
  return t.length >= 2 ? { tipo: "texto", texto: t.slice(0, 100) } : null;
}
