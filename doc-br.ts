// Validação de CPF/CNPJ com dígito verificador.
//
// Validar aqui (e não deixar a Pagar.me recusar) porque o erro do gateway vem
// em inglês ("Invalid CPF") e o cliente não entende — e a tentativa ainda conta
// como recusa no antifraude. Barrando antes, ele vê "CPF inválido" e conserta.

export function isCPF(v: string): boolean {
  const c = (v || "").replace(/\D/g, "");
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false; // 000.000.000-00 e afins passam na conta, mas não existem
  const dv = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(c[i]) * (len + 1 - i);
    const r = 11 - (sum % 11);
    return r >= 10 ? 0 : r;
  };
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
}

export function isCNPJ(v: string): boolean {
  const c = (v || "").replace(/\D/g, "");
  if (c.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(c)) return false;
  const dv = (len: number) => {
    // pesos vão de 2 a 9, ciclicamente, da direita pra esquerda
    let sum = 0;
    let peso = len - 7;
    for (let i = 0; i < len; i++) {
      sum += Number(c[i]) * peso;
      peso -= 1;
      if (peso < 2) peso = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(c[12]) && dv(13) === Number(c[13]);
}

/** 'individual' pra CPF válido, 'company' pra CNPJ válido, null se nenhum. */
export function tipoDoDocumento(v: string): "individual" | "company" | null {
  const c = (v || "").replace(/\D/g, "");
  if (c.length === 11) return isCPF(c) ? "individual" : null;
  if (c.length === 14) return isCNPJ(c) ? "company" : null;
  return null;
}
