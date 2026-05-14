import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'NEXUS — Autonomous AI Operating System | EZZAHCOMM',
  description:
    'EZZAHCOMM NEXUS is a fully autonomous AI operating system for African businesses. Deploy AI agents, automate operations, and scale intelligently.',
  keywords: [
    'AI operating system', 'autonomous AI', 'AI agents Kenya', 'business automation',
    'AI SaaS Africa', 'M-Pesa automation', 'multi-agent AI', 'EZZAHCOMM NEXUS',
  ],
  authors: [{ name: 'EZZAHCOMM', url: 'https://ezzahcomm.co.ke' }],
  openGraph: {
    title: 'NEXUS — Autonomous AI Operating System',
    description: 'Deploy AI agents that run your business 24/7. Built for African enterprises.',
    url: 'https://kitabuyetu.ezzahcomm.co.ke',
    siteName: 'EZZAHCOMM NEXUS',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NEXUS — Autonomous AI Operating System',
    description: 'Deploy AI agents that run your business 24/7.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-black text-white antialiased">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
