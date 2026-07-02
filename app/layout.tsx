import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "SPIRIT.CLO CRM",
  description: "Внутренняя CRM-система ателье индивидуального пошива SPIRIT.CLO"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
