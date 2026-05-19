import Link from 'next/link';

const LINKS = {
  Product: ['Agents', 'Marketplace', 'Pricing', 'Changelog', 'Roadmap'],
  Developers: ['API Reference', 'Documentation', 'GitHub', 'Self-Hosting'],
  Company: ['About', 'Blog', 'Careers', 'Contact'],
  Legal: ['Privacy Policy', 'Terms of Service', 'Security'],
};

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-900">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">N</span>
              <span className="font-semibold text-white">NEXUS</span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              Autonomous AI operating system for African enterprises.
            </p>
            <p className="text-xs text-slate-600 mt-4">© 2026 EZZAHCOMM. All rights reserved.</p>
          </div>

          {Object.entries(LINKS).map(([section, items]) => (
            <div key={section}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">{section}</p>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item}>
                    <Link href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">Built for Kenya. Scaling across Africa.</p>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 status-dot" />
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
