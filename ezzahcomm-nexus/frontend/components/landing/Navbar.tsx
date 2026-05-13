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
        scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/8' : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00ff88] to-[#0066ff] flex items-center justify-center text-black font-bold text-sm">N</span>
          <span className="font-semibold text-white tracking-tight">NEXUS</span>
          <span className="text-xs text-white/30 ml-1">by EZZAHCOMM</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
          <a href="#agents" className="hover:text-white transition-colors">Agents</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </div>

        {/* CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/auth/login" className="text-sm text-white/60 hover:text-white transition-colors px-4 py-2">
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="text-sm bg-[#00ff88] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#00e87a] transition-colors"
          >
            Start Free Trial
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-white/60 hover:text-white"
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

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-black/95 border-b border-white/8 px-6 pb-6 flex flex-col gap-4 text-sm text-white/60">
          <a href="#agents" onClick={() => setMenuOpen(false)} className="hover:text-white pt-4">Agents</a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="hover:text-white">How It Works</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)} className="hover:text-white">Pricing</a>
          <a href="#faq" onClick={() => setMenuOpen(false)} className="hover:text-white">FAQ</a>
          <Link href="/auth/signup" className="mt-2 text-center bg-[#00ff88] text-black font-semibold px-4 py-2.5 rounded-lg">
            Start Free Trial
          </Link>
        </div>
      )}
    </header>
  );
}
