import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Plataforma de checkout para infoprodutos",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#10b981",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Pre-conexão pra reduzir latência em consultas de CEP */}
        <link rel="preconnect" href="https://viacep.com.br" />
        <link rel="dns-prefetch" href="https://viacep.com.br" />
      </head>
      <body className="font-sans">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
