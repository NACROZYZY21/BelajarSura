import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Belajar Ceria — Belajar Jadi Menyenangkan!",
  description:
    "Platform belajar interaktif untuk anak SD: membaca, berhitung, kuis seru, dan game edukatif.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${baloo.variable} ${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-sky-50 text-slate-800">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
