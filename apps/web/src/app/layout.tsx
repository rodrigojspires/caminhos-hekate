import type { Metadata } from "next";
import { Inter, EB_Garamond } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemeProvider as CustomThemeProvider } from "@/components/providers/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans",
  display: 'swap',
});

const ebGaramond = EB_Garamond({ 
  subsets: ["latin"],
  variable: "--font-serif",
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: "Caminhos de Hekate - Transforme sua vida através do autoconhecimento",
    template: "%s | Caminhos de Hekate"
  },
  description: "Descubra cursos exclusivos de desenvolvimento pessoal, espiritualidade e autoconhecimento. Junte-se à nossa comunidade e transforme sua jornada.",
  keywords: "autoconhecimento, desenvolvimento pessoal, espiritualidade, cursos online, Hekate",
  authors: [{ name: "Caminhos de Hekate" }],
  creator: "Caminhos de Hekate",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://caminhosdehekate.com",
    title: "Caminhos de Hekate",
    description: "Transforme sua vida através do autoconhecimento",
    siteName: "Caminhos de Hekate",
  },
  twitter: {
    card: "summary_large_image",
    title: "Caminhos de Hekate",
    description: "Transforme sua vida através do autoconhecimento",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} ${ebGaramond.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              <CustomThemeProvider>
                <PublicLayout>
                  {children}
                </PublicLayout>
                <Toaster />
              </CustomThemeProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
