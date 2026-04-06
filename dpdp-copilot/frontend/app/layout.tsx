"use client";

import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ClerkProvider } from '@clerk/nextjs';
import NavBar from "@/components/NavBar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <title>DPDP Compliance Copilot</title>
          <meta name="description" content="AI-powered DPDP Act 2023 compliance analysis for Indian SaaS" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 flex flex-col transition-colors">
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <NavBar />
            <main className="flex-1">{children}</main>
            <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-6 mt-12 transition-colors">
              <div className="max-w-6xl mx-auto text-center text-sm text-gray-500 dark:text-gray-400">
                <p>
                  Powered by DPDP Act 2023 and DPDP Rules 2025. This tool provides
                  guidance only — consult a qualified legal professional for binding
                  compliance assessments.
                </p>
                <p className="mt-2">
                  Built by Ankur Kushwaha —{" "}
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
    </ClerkProvider>
  );
}
