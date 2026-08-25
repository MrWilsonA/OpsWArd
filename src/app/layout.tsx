import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpsWArd - Distributed Incident Command & Spatial Tactical War-Room',
  description: 'Enterprise-grade 2D Pixel Tactical Control Room, Spatial Proximity Mesh, Distributed Raft Consensus, and Temporal Playbook Orchestration.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600;700;800&family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#07090e] text-slate-100 min-h-screen antialiased selection:bg-cyan-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
