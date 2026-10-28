// Regras puras da API de integração (src/lib/integracao-regra.ts).
// Rodar: npm test   (ou: node --experimental-strip-types --test tests/integracao-regra.test.mjs)
import test from "node:test";
import assert from "node:assert/strict";
import { chaveConfere, minimoCentavos, nomeDaOferta, ehDaIntegracao, telefoneCasa, lerBusca } from "../src/lib/integracao-regra.ts";

const CHAVE = "k".repeat(40);

test("chave: só Bearer com a chave exata", () => {
  assert.equal(chaveConfere(`Bearer ${CHAVE}`, CHAVE), true);
  assert.equal(chaveConfere(`Bearer ${CHAVE}x`, CHAVE), false);
  assert.equal(chaveConfere(CHAVE, CHAVE), false);
  assert.equal(chaveConfere(null, CHAVE), false);
});

test("chave: sem variável ou curta demais, nada passa", () => {
  assert.equal(chaveConfere("Bearer ", undefined), false);
  assert.equal(chaveConfere("Bearer abc", "abc"), false);
});

test("mínimo: padrão R$ 1,00, variável válida substitui", () => {
  assert.equal(minimoCentavos(undefined), 100);
  assert.equal(minimoCentavos(""), 100);
  assert.equal(minimoCentavos("abc"), 100);
  assert.equal(minimoCentavos("99700"), 99700);
  assert.equal(minimoCentavos("50"), 100);
});

test("nome da oferta: autor, valor em reais e data de Brasília", () => {
  const quando = new Date("2026-10-24T02:30:00Z"); // 23/10 23:30 em Brasília
  assert.equal(nomeDaOferta("Ana", 149700, quando), "Ana · R$ 1.497 · 23/10");
  assert.equal(nomeDaOferta("Ana", 99750, quando), "Ana · R$ 997,50 · 23/10");
});

test("oferta da integração: começa com o autor e o separador", () => {
  assert.equal(ehDaIntegracao("Ana · R$ 1.497 · 23/10", "Ana"), true);
  assert.equal(ehDaIntegracao("Black Friday", "Ana"), false);
});

test("telefone: casa pelos 8 últimos dígitos, com ou sem formatação", () => {
  assert.equal(telefoneCasa("(11) 3000-1234", "+55 11 3000-1234"), true);
  assert.equal(telefoneCasa("551130001234", "30001234"), true);
  assert.equal(telefoneCasa("551130001235", "30001234"), false);
  // celular: o 9 da frente não atrapalha
  assert.equal(telefoneCasa("11 9 3000-1234", "+55 11 3000-1234"), true);
});

test("busca: 8+ dígitos é telefone, senão texto; curta demais é nula", () => {
  assert.deepEqual(lerBusca("+55 11 3000-1234"), { tipo: "telefone", digitos: "551130001234" });
  assert.deepEqual(lerBusca("Maria Souza"), { tipo: "texto", texto: "Maria Souza" });
  assert.equal(lerBusca(" a "), null);
});
