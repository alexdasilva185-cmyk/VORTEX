/**
 * Lista de países (DDI + bandeira) para o seletor de telefone do checkout.
 * O pagamento é sempre em BRL — isto só define o código de discagem do
 * telefone do cliente. Brasil é o padrão.
 */

export type Country = {
  code: string; // ISO-2
  name: string;
  flag: string; // emoji
  dial: string; // DDI sem o "+"
};

export const DEFAULT_COUNTRY = "BR";

// Brasil primeiro; demais em ordem alfabética. Lista enxuta dos países
// mais comuns + principais — cobre praticamente todo o tráfego.
export const COUNTRIES: Country[] = [
  { code: "BR", name: "Brasil", flag: "🇧🇷", dial: "55" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", dial: "351" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸", dial: "1" },
  { code: "AO", name: "Angola", flag: "🇦🇴", dial: "244" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", dial: "54" },
  { code: "AU", name: "Austrália", flag: "🇦🇺", dial: "61" },
  { code: "BE", name: "Bélgica", flag: "🇧🇪", dial: "32" },
  { code: "BO", name: "Bolívia", flag: "🇧🇴", dial: "591" },
  { code: "CA", name: "Canadá", flag: "🇨🇦", dial: "1" },
  { code: "CL", name: "Chile", flag: "🇨🇱", dial: "56" },
  { code: "CO", name: "Colômbia", flag: "🇨🇴", dial: "57" },
  { code: "CV", name: "Cabo Verde", flag: "🇨🇻", dial: "238" },
  { code: "DE", name: "Alemanha", flag: "🇩🇪", dial: "49" },
  { code: "ES", name: "Espanha", flag: "🇪🇸", dial: "34" },
  { code: "FR", name: "França", flag: "🇫🇷", dial: "33" },
  { code: "GB", name: "Reino Unido", flag: "🇬🇧", dial: "44" },
  { code: "IE", name: "Irlanda", flag: "🇮🇪", dial: "353" },
  { code: "IT", name: "Itália", flag: "🇮🇹", dial: "39" },
  { code: "JP", name: "Japão", flag: "🇯🇵", dial: "81" },
  { code: "MX", name: "México", flag: "🇲🇽", dial: "52" },
  { code: "MZ", name: "Moçambique", flag: "🇲🇿", dial: "258" },
  { code: "NL", name: "Países Baixos", flag: "🇳🇱", dial: "31" },
  { code: "PY", name: "Paraguai", flag: "🇵🇾", dial: "595" },
  { code: "PE", name: "Peru", flag: "🇵🇪", dial: "51" },
  { code: "CH", name: "Suíça", flag: "🇨🇭", dial: "41" },
  { code: "UY", name: "Uruguai", flag: "🇺🇾", dial: "598" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪", dial: "58" },
];

export function getCountry(code: string): Country {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];
}
