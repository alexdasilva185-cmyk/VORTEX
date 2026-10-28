/**
 * Camada sobre a API v5 da Pagar.me (PSP / Gateway).
 * https://docs.pagar.me/reference
 *
 * Autenticação:
 *   - Endpoints servidor → Basic Auth com sk_xxx:.
 *   - POST /core/v5/tokens?appId=pk_xxx → não exige sk_ (pode rodar no client).
 *
 * Este módulo só fica funcional quando PAGARME_API_KEY estiver setada.
 * Para tokenização no client a chave usada é a PAGARME_PUBLIC_KEY.
 */

const PAGARME_API = "https://api.pagar.me/core/v5";

export class PagarmeNotConfiguredError extends Error {
  constructor() {
    super("PAGARME_API_KEY não configurada");
    this.name = "PagarmeNotConfiguredError";
  }
}

export class PagarmeError extends Error {
  status: number;
  payload: unknown;
  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "PagarmeError";
    this.status = status;
    this.payload = payload;
  }
}

function authHeader(): string {
  const key = process.env.PAGARME_API_KEY;
  if (!key) throw new PagarmeNotConfiguredError();
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${PAGARME_API}${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    throw new PagarmeError(
      `Pagar.me ${method} ${path} → ${res.status}`,
      res.status,
      json
    );
  }
  return json as T;
}

// ─── Tipos compartilhados ────────────────────────────────────────────────────

export type PagarmePhone = {
  country_code: string;
  area_code: string;
  number: string;
};

export type PagarmeAddress = {
  line_1: string;
  line_2?: string;
  zip_code: string;
  city: string;
  state: string;
  country: string;
};

export type PagarmeCustomer = {
  name: string;
  email: string;
  type: "individual" | "company";
  document: string;
  document_type?: "CPF" | "CNPJ";
  phones?: {
    home_phone?: PagarmePhone;
    mobile_phone?: PagarmePhone;
  };
  address?: PagarmeAddress;
  /**
   * Endereço IP do cliente — usado pelo antifraude.
   */
  // observado por compatibilidade
};

export type PagarmeSplit = {
  recipient_id: string;
  amount: number;
  type: "flat" | "percentage";
  options?: {
    charge_processing_fee?: boolean;
    charge_remainder_fee?: boolean;
    liable?: boolean;
  };
};

export type PagarmeAntifraud = {
  type: "clearsale";
  clearsale?: {
    custom_sla?: number;
  };
};

export type PagarmePixPayment = {
  payment_method: "pix";
  /** obrigatório no "Cartão + Pix" (pedido com mais de um pagamento) */
  amount?: number;
  pix: { expires_in: number; additional_information?: { name: string; value: string }[] };
  split?: PagarmeSplit[];
};

export type PagarmeCardPaymentBase = {
  payment_method: "credit_card";
  /** obrigatório quando o pedido tem mais de um pagamento (compra em 2 cartões) */
  amount?: number;
  credit_card: {
    /**
     * Dados do cartão.
     *  - Com `card_token`: mande APENAS `billing_address` aqui. A Pagar.me
     *    exige o billing dentro de `card` mesmo quando o cartão vem via token
     *    (mandar `billing_address` solto em `credit_card` não funciona, e
     *    `customer.address` sozinho também não basta).
     *  - Sem token (fallback dev/sandbox): mande o cartão completo.
     */
    card?: {
      number?: string;
      holder_name?: string;
      exp_month?: number;
      exp_year?: number;
      cvv?: string;
      billing_address: PagarmeAddress;
    };
    /** token gerado via POST /tokens (recomendado em produção) */
    card_token?: string;
    installments: number;
    statement_descriptor?: string;
    operation_type?: "auth_and_capture" | "auth_only" | "pre_auth";
  };
  split?: PagarmeSplit[];
};

export type PagarmeCardPayment = PagarmeCardPaymentBase;

export type PagarmePayment = PagarmePixPayment | PagarmeCardPayment;

export type PagarmeItem = {
  amount: number;
  description: string;
  quantity: number;
  code?: string;
  category?: string;
};

export type PagarmeCreateOrderInput = {
  items: PagarmeItem[];
  customer: PagarmeCustomer;
  customer_id?: string;
  payments: PagarmePayment[];
  code?: string;
  antifraud_enabled?: boolean;
  ip?: string;
  session_id?: string;
  metadata?: Record<string, string>;
};

export type PagarmeCharge = {
  id: string;
  /** pending | paid | overpaid | underpaid | processing | failed | canceled | chargedback */
  status: string;
  amount: number;
  payment_method?: string;
  last_transaction?: {
    status?: string;
    antifraud_response?: { status?: string; return_message?: string };
    qr_code?: string;
    qr_code_url?: string;
    expires_at?: string;
    acquirer_name?: string;
    acquirer_message?: string;
    gateway_response?: { code?: string; errors?: { message?: string }[] };
  };
};

export type PagarmeOrder = {
  id: string;
  status: string;
  amount: number;
  customer_id?: string;
  charges?: PagarmeCharge[];
  metadata?: Record<string, string>;
};

// ─── Token (cartão) ──────────────────────────────────────────────────────────

export type PagarmeCardTokenInput = {
  type: "card";
  card: {
    number: string;
    holder_name: string;
    exp_month: number;
    exp_year: number;
    cvv: string;
    brand?: string;
    label?: string;
  };
};

export type PagarmeCardToken = {
  id: string;
  type: "card";
  created_at: string;
  expires_at: string;
  card: {
    last_four_digits: string;
    holder_name: string;
    exp_month: number;
    exp_year: number;
    brand: string;
  };
};

// ─── Reembolso ───────────────────────────────────────────────────────────────

export type PagarmeRefundInput = {
  amount?: number; // se omitido, estorna o total
};

// ─── Recebedores ─────────────────────────────────────────────────────────────

export type PagarmeBankAccount = {
  holder_name: string;
  holder_type: "individual" | "company";
  holder_document: string;
  bank: string; // ex: "001" Banco do Brasil
  branch_number: string;
  branch_check_digit?: string;
  account_number: string;
  account_check_digit: string;
  type: "checking" | "savings";
};

export type PagarmeRecipientInput = {
  name: string;
  email: string;
  description?: string;
  document: string;
  type: "individual" | "corporation";
  default_bank_account: PagarmeBankAccount;
  transfer_settings?: {
    transfer_enabled: boolean;
    transfer_interval?: "daily" | "weekly" | "monthly";
    transfer_day?: number;
  };
  code?: string;
  payment_mode?: "bank_transfer";
};

export type PagarmeRecipient = {
  id: string;
  name: string;
  email: string;
  document: string;
  status: "registered" | "affiliation" | "blocked";
  created_at: string;
  default_bank_account: PagarmeBankAccount & { id: string; status: string };
};

// ─── Endereço público padrão ─────────────────────────────────────────────────

/**
 * Endereço de cobrança fixo, público, aceito pelo antifraude da Pagar.me.
 * Usado quando o checkout não coleta endereço do cliente (Praça da Sé, SP).
 */
export const DEFAULT_BILLING_ADDRESS: PagarmeAddress = {
  line_1: "S/N, Praça da Sé, Sé",
  zip_code: "01001000",
  city: "São Paulo",
  state: "SP",
  country: "BR",
};

/**
 * Nome que aparece na fatura do cartão: até 13 caracteres, sem acento.
 * Usa PAGARME_STATEMENT_DESCRIPTOR ou o nome do produto.
 * "Curso Ação Rápida" → "CURSO ACAO RA" (o acento sai antes de cortar o tamanho).
 */
export function statementDescriptor(name: string): string {
  const fromEnv = process.env.PAGARME_STATEMENT_DESCRIPTOR;
  const base = (fromEnv || name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return base.slice(0, 13).trim() || "CHECKOUT";
}

// ─── Erros amigáveis ─────────────────────────────────────────────────────────

const AUTH_ERROR_RE =
  /(authorization has been denied|unauthorized|invalid api key|invalid_authorization|not authenticated|access denied|invalid credentials|forbidden)/i;

const GENERIC_MESSAGE =
  "Não conseguimos aprovar o pagamento. Confira os dados do cartão, tente outro cartão ou pague com Pix.";

/**
 * Mensagem em português pro cliente a partir da resposta da Pagar.me.
 *
 * Olha a cobrança que FALHOU (numa compra em 2 cartões, `charges[0]` pode ser
 * a aprovada — o motivo viria "Transação aprovada" numa recusa). Ordem:
 *   antifraude reprovado → gateway_response.errors → acquirer_message →
 *   errors → message
 * Erro de auth/config nunca vaza pro cliente (é problema nosso, não dele).
 */
export function friendlyError(payload: unknown): string {
  const raw = extractRawMessage(payload);
  if (raw === ANTIFRAUD) {
    return "Pagamento não aprovado pela análise de segurança. Tente outro cartão ou pague com Pix.";
  }
  const msg = raw ?? "";
  if (!msg) return GENERIC_MESSAGE;
  if (AUTH_ERROR_RE.test(msg)) {
    return "Pagamento temporariamente indisponível. Tente novamente em instantes ou pague com Pix.";
  }
  if (/insufficient funds|not enough|no balance|saldo insuficiente|limite/i.test(msg))
    return "Cartão sem limite suficiente. Tente outro cartão, divida em 2 cartões ou pague com Pix.";
  if (/expired card|card.*expired|vencid|expirad/i.test(msg))
    return "Cartão vencido. Confira a validade ou use outro cartão.";
  if (/cvv|security code|c[oó]digo de seguran/i.test(msg))
    return "Código de segurança (CVV) inválido. Confira e tente de novo.";
  if (/invalid card number|card number|n[uú]mero do cart[aã]o inv/i.test(msg))
    return "Número do cartão inválido. Confira os dígitos.";
  if (/card verification failed|could not create credit card|verification failed/i.test(msg))
    return "Não conseguimos validar seu cartão. Confira número, validade e CVV ou use outro cartão.";
  if (/token/i.test(msg))
    return "Os dados do cartão expiraram. Confira os dados e clique em pagar de novo.";
  if (/declined|refused|denied|do not honor|n[aã]o autorizad|recusad|negad/i.test(msg))
    return "Pagamento não autorizado pelo banco emissor. Tente outro cartão, fale com seu banco ou pague com Pix.";
  // mensagem da adquirente em português costuma ser útil; inglês técnico não
  if (msg.length <= 120 && !/[a-z]+_[a-z]+|\bthe\b|\bis\b|required|invalid/i.test(msg)) {
    return msg;
  }
  return GENERIC_MESSAGE;
}

const ANTIFRAUD = "__antifraud_reproved__";

function extractRawMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;

  const charges = p.charges as PagarmeCharge[] | undefined;
  if (Array.isArray(charges) && charges.length) {
    const failed =
      charges.find((c) => c.status === "failed") ??
      charges.find((c) => c.last_transaction?.status !== "captured") ??
      charges[0];
    const lt = failed?.last_transaction;
    if (lt) {
      const af = lt.antifraud_response?.status;
      if (af && /reproved|denied|failed/i.test(af)) return ANTIFRAUD;
      const gwMsg = lt.gateway_response?.errors?.find((e) => e.message)?.message;
      if (gwMsg) return gwMsg;
      if (lt.acquirer_message) return lt.acquirer_message;
    }
  }

  const errors = p.errors as unknown;
  if (Array.isArray(errors) && errors[0]) {
    const e = errors[0] as Record<string, unknown>;
    if (typeof e.message === "string") return e.message;
  } else if (errors && typeof errors === "object") {
    // formato 422 da v5: { errors: { "campo": ["mensagem"] } }
    const first = Object.values(errors as Record<string, unknown>)[0];
    if (Array.isArray(first) && typeof first[0] === "string") return first[0];
  }
  if (typeof p.message === "string") return p.message as string;
  return null;
}

// ─── Cliente da API ──────────────────────────────────────────────────────────

export const pagarme = {
  isConfigured(): boolean {
    return Boolean(process.env.PAGARME_API_KEY);
  },

  // Orders
  createOrder(input: PagarmeCreateOrderInput) {
    return request<PagarmeOrder>("POST", "/orders", input);
  },
  getOrder(id: string) {
    return request<PagarmeOrder>("GET", `/orders/${id}`);
  },

  // Charges (uma order vira uma charge — o ID que importa pra estorno)
  refundCharge(chargeId: string, input?: PagarmeRefundInput) {
    return request<PagarmeCharge>(
      "DELETE",
      `/charges/${chargeId}`,
      input?.amount ? { amount: input.amount } : undefined
    );
  },

  // Recipients
  createRecipient(input: PagarmeRecipientInput) {
    return request<PagarmeRecipient>("POST", "/recipients", input);
  },
  getRecipient(id: string) {
    return request<PagarmeRecipient>("GET", `/recipients/${id}`);
  },
  listRecipients(page = 1, size = 30) {
    return request<{ data: PagarmeRecipient[] }>(
      "GET",
      `/recipients?page=${page}&size=${size}`
    );
  },
};

/**
 * Gera um card_token. Endpoint público da Pagar.me — usa appId=pk_xxx
 * em vez de Basic sk_xxx. Funciona no client e no server.
 */
export async function createCardToken(
  publicKey: string,
  input: PagarmeCardTokenInput
): Promise<PagarmeCardToken> {
  const res = await fetch(
    `${PAGARME_API}/tokens?appId=${encodeURIComponent(publicKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    throw new PagarmeError(
      `Pagar.me POST /tokens → ${res.status}`,
      res.status,
      json
    );
  }
  return json as PagarmeCardToken;
}
