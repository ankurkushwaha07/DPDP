import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">DC</span>
              </div>
              <span className="font-semibold text-lg text-gray-900">DPDP Copilot</span>
            </a>
            <nav className="flex items-center gap-4 text-sm text-gray-600">
              <a href="/" className="hover:text-teal-600">Home</a>
              <a href="/analyze" className="hover:text-teal-600">Analyze</a>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="bg-white border-t border-gray-200 px-6 py-6 mt-12">
          <div className="max-w-6xl mx-auto text-center text-sm text-gray-500">
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
      </body>
    </html>
  );
}
