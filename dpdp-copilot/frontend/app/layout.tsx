import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "DPDP Compliance Copilot",
  description: "AI-powered DPDP Act 2023 compliance analysis for Indian SaaS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 flex flex-col transition-colors">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 transition-colors">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <a href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">DC</span>
                </div>
                <span className="font-semibold text-lg text-gray-900 dark:text-gray-100">DPDP Copilot</span>
              </a>
              <nav className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                <a href="/" className="hover:text-teal-600 dark:hover:text-teal-400">Home</a>
                <a href="/analyze" className="hover:text-teal-600 dark:hover:text-teal-400">Analyze</a>
                <div className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-1" />
                <ThemeToggle />
              </nav>
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-6 mt-12 transition-colors">
            <div className="max-w-6xl mx-auto text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              Powered by DPDP Act 2023 and DPDP Rules 2025. This tool provides
              guidance only - consult a qualified legal professional for binding
              compliance assessments.
            </p>
            <p className="mt-2">
              Built by Ankur Kushwaha -{" "}
              <a
                href="https://linkedin.com/in/ankursingh-kushwaha"
                className="text-teal-600 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                LinkedIn
              </a>
              </p>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
