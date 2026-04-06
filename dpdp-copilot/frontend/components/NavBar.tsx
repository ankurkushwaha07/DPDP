"use client";

import { useState } from "react";
import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/ThemeToggle";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useUser();
  const isAdmin = ADMIN_EMAIL &&
    user?.primaryEmailAddress?.emailAddress === ADMIN_EMAIL;

  return (
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
          {isAdmin && (
            <a href="/admin" className="hover:text-teal-600 dark:hover:text-teal-400">Admin</a>
          )}
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-1" />
          <ThemeToggle />
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-1" />
          <SignedOut>
            <a href="/analyze" className="text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition">
              Continue without logging in
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
          {isAdmin && (
            <a href="/admin" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Admin</a>
          )}
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
  );
}
