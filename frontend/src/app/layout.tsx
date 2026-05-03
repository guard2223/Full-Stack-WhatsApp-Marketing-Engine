import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import SidebarWrapper from "@/components/SidebarWrapper";

export const metadata: Metadata = {
  title: "Saden WA | منصة التسويق الذكي عبر الواتساب",
  description: "أرسل حملاتك التسويقية بذكاء تام عبر الواتساب مع سادن وا",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="dark" style={{ colorScheme: 'dark' }}>
      <body className={`font-sans flex bg-black text-white antialiased min-h-screen selection:bg-blue-500/30 selection:text-white`}>
        <LanguageProvider>
          <AuthProvider>
            <SidebarWrapper>
              {children}
            </SidebarWrapper>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
