import Link from 'next/link';

const LINKS = {
  Product: ['Agents', 'Marketplace', 'Pricing', 'Changelog', 'Roadmap'],
  Developers: ['API Reference', 'Documentation', 'GitHub', 'Self-Hosting'],
  Company: ['About', 'Blog', 'Careers', 'Contact'],
  Legal: ['Privacy Policy', 'Terms of Service', 'Security'],
};

export default function Footer() {
  return (
    <footer className="border-t border-white/8 bg-[#030303]">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00ff88] to-[#0066ff] flex items-center justify-center text-black font-bold text-sm">N</span>
              <span className="font-semibold text-white">NEXUS</span>
            </Link>
            <p className="text-xs text-white/30 leading-relaxed">
              Autonomous AI operating system for African enterprises.
            </p>
            <p className="text-xs text-white/20 mt-4">© 2026 EZZAHCOMM. All rights reserved.</p>
          </div>

          {/* Nav columns */}
          {Object.entries(LINKS).map(([section, items]) => (
            <div key={section}>
              <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">{section}</p>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item}>
                    <Link href="#" className="text-sm text-white/30 hover:text-white/70 transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/20">Built for Kenya. Scaling across Africa.</p>
          <div className="flex items-center gap-4 text-xs text-white/20">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] status-dot" />
              All systems operational
            </span>
            <span>•</span>
            <span>99.9% uptime</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
