/**
 * Parcelamento — juros simples embutido no valor.
 *
 * Padrão: 1,6667% ao mês, 1x sem juros, máximo 12x. Piso de R$5,00 por
 * parcela pra evitar oferecer "12x de R$0,83". Pra mudar a taxa, o máximo de
 * parcelas ou o piso, troque as constantes abaixo (valem pro checkout e pra
 * cobrança, que leem daqui).
 *
 * ⚠️ A Orders API do Pagar.me NÃO aplica juros. O valor que enviamos já
 * vai com juros embutido — a Pagar.me só divide em N parcelas iguais no
 * cartão do cliente.
 */

export const INSTALLMENT_MONTHLY_RATE = 0.016667; // 1,6667% a.m.
export const MIN_INSTALLMENT_CENTS = 500; // R$ 5,00 por parcela
export const MAX_INSTALLMENTS = 12;

/**
 * Valor de UMA parcela (em centavos) quando o preço base é dividido em N.
 * 1x = à vista, sem juros. 2x+ aplica juros simples e arredonda pra cima
 * pra garantir que N * per >= base.
 */
export function calcInstallmentAmountCents(
  baseCents: number,
  n: number
): number {
  if (n <= 1) return baseCents;
  const totalWithInterest = Math.round(
    baseCents * (1 + INSTALLMENT_MONTHLY_RATE * n)
  );
  return Math.ceil(totalWithInterest / n);
}

/**
 * Valor total cobrado (soma das N parcelas). É o `amount` que enviamos pra
 * Pagar.me — não é o preço "de tabela" do produto.
 */
export function calcTotalWithInterestCents(
  baseCents: number,
  n: number
): number {
  if (n <= 1) return baseCents;
  return calcInstallmentAmountCents(baseCents, n) * n;
}

/**
 * Maior N em que cada parcela ainda respeita o piso mínimo.
 * Ex.: base R$10 → só 1x ou 2x (R$5 cada); base R$1300 → até 12x.
 */
export function maxAllowedInstallments(
  baseCents: number,
  hardCap = MAX_INSTALLMENTS
): number {
  for (let n = Math.min(hardCap, MAX_INSTALLMENTS); n >= 1; n--) {
    if (calcInstallmentAmountCents(baseCents, n) >= MIN_INSTALLMENT_CENTS) {
      return n;
    }
  }
  return 1;
}

export type InstallmentOption = {
  n: number;
  perInstallmentCents: number;
  totalCents: number;
  hasInterest: boolean;
};

/**
 * Lista de opções pra popular o select do checkout.
 * Só inclui as parcelas que respeitam o piso mínimo.
 */
export function buildInstallmentOptions(
  baseCents: number,
  hardCap = MAX_INSTALLMENTS
): InstallmentOption[] {
  const max = maxAllowedInstallments(baseCents, hardCap);
  const out: InstallmentOption[] = [];
  for (let n = 1; n <= max; n++) {
    const per = calcInstallmentAmountCents(baseCents, n);
    out.push({
      n,
      perInstallmentCents: per,
      totalCents: per * n,
      hasInterest: n > 1,
    });
  }
  return out;
}
