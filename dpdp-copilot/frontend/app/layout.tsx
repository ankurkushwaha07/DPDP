"use client";

import "./globals.css";
import { useState } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

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
          <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-3 transition-colors">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <a href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">DC</span>
                </div>
                <span className="font-semibold text-base sm:text-lg text-gray-900 dark:text-gray-100">DPDP Copilot</span>
              </a>

              {/* Desktop nav */}
              <nav className="hidden sm:flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                <a href="/" className="hover:text-teal-600 dark:hover:text-teal-400">Home</a>
                <a href="/analyze" className="hover:text-teal-600 dark:hover:text-teal-400">Analyze</a>
                <SignedIn>
                  <a href="/admin" className="hover:text-teal-600 dark:hover:text-teal-400">Admin</a>
                </SignedIn>
                <div className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-1" />
                <ThemeToggle />
                <div className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-1" />
                <SignedOut>
                  <a href="/analyze" className="text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition">
                    Try Free
                  </a>
                  <SignInButton mode="modal">
                    <button className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition">
                      Sign In
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
              </nav>

              {/* Mobile: theme toggle + hamburger */}
              <div className="flex sm:hidden items-center gap-2">
                <ThemeToggle />
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Toggle menu"
                >
                  {menuOpen ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Mobile dropdown menu */}
            {menuOpen && (
              <div className="sm:hidden mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 flex flex-col gap-1">
                <a href="/" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Home</a>
                <a href="/analyze" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Analyze</a>
                <SignedIn>
                  <a href="/admin" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Admin</a>
                </SignedIn>
                <div className="px-3 py-2 flex flex-col gap-2">
                  <SignedOut>
                    <SignInButton mode="modal">
                      <button className="w-full bg-teal-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700 transition">
                        Sign In
                      </button>
                    </SignInButton>
                    <a href="/analyze" onClick={() => setMenuOpen(false)} className="w-full text-center border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                      Continue without logging in
                    </a>
                  </SignedOut>
                  <SignedIn>
                    <div className="flex items-center gap-2">
                      <UserButton afterSignOutUrl="/" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Account</span>
                    </div>
                  </SignedIn>
                </div>
              </div>
            )}
          </header>

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
