import { NextRequest, NextResponse } from "next/server";
import { chaveConfere } from "@/lib/integracao-regra";

/**
 * API de integração (opcional). Desligada enquanto INTEGRACAO_CHAVE não existir.
 * Quem chama manda `Authorization: Bearer <INTEGRACAO_CHAVE>` (40+ caracteres).
 */

export function autorizar(req: NextRequest): NextResponse | null {
  if (!process.env.INTEGRACAO_CHAVE) return NextResponse.json({ erro: "integração desligada" }, { status: 503 });
  if (!chaveConfere(req.headers.get("authorization"), process.env.INTEGRACAO_CHAVE))
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  return null;
}

export const SEM_CACHE = { "Cache-Control": "no-store" };
