/**
 * Ícones do checkout (abas de pagamento e campos do cartão). Cor herda do
 * `currentColor`, então a aba ativa pinta o ícone de azul sozinha.
 */
type P = React.SVGProps<SVGSVGElement>;

export function CardIcon({ className = "size-5", ...props }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden {...props}>
      <rect x="2" y="4.5" width="20" height="15" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="2" y="8" width="20" height="3" fill="currentColor" />
      <rect x="5" y="14.5" width="6" height="2" rx="0.5" fill="currentColor" />
    </svg>
  );
}

export function TwoCardsIcon({ className = "size-5", ...props }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden {...props}>
      <path d="M6 3.5h14a2 2 0 0 1 2 2V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="2" y="7" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="2" y="10" width="17" height="2.5" fill="currentColor" />
      <rect x="4.5" y="15.5" width="5" height="2" rx="0.5" fill="currentColor" />
    </svg>
  );
}

/** Escudo preto com cadeado — fica dentro do campo "Número do cartão". */
export function ShieldLockIcon({ className = "size-4", ...props }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...props}>
      <path
        d="M12 1.5 3.5 4.8v6.1c0 5.3 3.6 10.1 8.5 11.6 4.9-1.5 8.5-6.3 8.5-11.6V4.8L12 1.5Z"
        fill="currentColor"
      />
      <rect x="8.5" y="10.5" width="7" height="5.5" rx="1" fill="#fff" />
      <path d="M10 10.5V9a2 2 0 0 1 4 0v1.5" stroke="#fff" strokeWidth="1.6" fill="none" />
    </svg>
  );
}

/** Círculo preto com "?" — fica dentro do campo "Cód. segurança". */
export function QuestionCircleIcon({ className = "size-4", ...props }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...props}>
      <circle cx="12" cy="12" r="11" fill="currentColor" />
      <path
        d="M9.2 9.2a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.4-2.8 4"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="12" cy="17.6" r="1.3" fill="#fff" />
    </svg>
  );
}

/** Relógio branco da barra vermelha de contagem regressiva. */
export function ClockBadgeIcon({ className = "size-7", ...props }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...props}>
      <circle cx="12" cy="12" r="11" fill="#fff" />
      <path d="M12 6v6.5l4 2.3" stroke="#ff0000" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** Escudo pequeno cinza da linha "Protegemos seus dados…". */
export function ShieldSmallIcon({ className = "size-3.5", ...props }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...props}>
      <path
        d="M12 1.5 3.5 4.8v6.1c0 5.3 3.6 10.1 8.5 11.6 4.9-1.5 8.5-6.3 8.5-11.6V4.8L12 1.5Z"
        fill="currentColor"
      />
      <rect x="9" y="11" width="6" height="4.5" rx="0.8" fill="#fff" />
      <path d="M10.3 11V9.8a1.7 1.7 0 0 1 3.4 0V11" stroke="#fff" strokeWidth="1.4" fill="none" />
    </svg>
  );
}
