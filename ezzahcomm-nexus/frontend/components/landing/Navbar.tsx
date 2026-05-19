'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">N</span>
          <span className={`font-semibold tracking-tight transition-colors ${scrolled ? 'text-slate-900' : 'text-white'}`}>NEXUS</span>
          <span className={`text-xs ml-1 transition-colors ${scrolled ? 'text-slate-400' : 'text-white/40'}`}>by EZZAHCOMM</span>
        </Link>

        <div className={`hidden md:flex items-center gap-8 text-sm transition-colors ${scrolled ? 'text-slate-600' : 'text-white/70'}`}>
          <a href="#agents" className={`hover:transition-colors ${scrolled ? 'hover:text-slate-900' : 'hover:text-white'}`}>Agents</a>
          <a href="#how-it-works" className={`hover:transition-colors ${scrolled ? 'hover:text-slate-900' : 'hover:text-white'}`}>How It Works</a>
          <a href="#pricing" className={`hover:transition-colors ${scrolled ? 'hover:text-slate-900' : 'hover:text-white'}`}>Pricing</a>
          <a href="#faq" className={`hover:transition-colors ${scrolled ? 'hover:text-slate-900' : 'hover:text-white'}`}>FAQ</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/auth/login"
            className={`text-sm px-4 py-2 transition-colors ${scrolled ? 'text-slate-600 hover:text-slate-900' : 'text-white/70 hover:text-white'}`}
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="text-sm bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Start Free Trial
          </Link>
        </div>

        <button
          type="button"
          className={`md:hidden transition-colors ${scrolled ? 'text-slate-600 hover:text-slate-900' : 'text-white/70 hover:text-white'}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </nav>

      {menuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-6 pb-6 flex flex-col gap-4 text-sm text-slate-600 shadow-lg">
          <a href="#agents" onClick={() => setMenuOpen(false)} className="hover:text-slate-900 pt-4">Agents</a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="hover:text-slate-900">How It Works</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)} className="hover:text-slate-900">Pricing</a>
          <a href="#faq" onClick={() => setMenuOpen(false)} className="hover:text-slate-900">FAQ</a>
          <Link href="/auth/signup" className="mt-2 text-center bg-blue-600 text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-blue-700">
            Start Free Trial
          </Link>
        </div>
      )}
    </header>
  );
}
