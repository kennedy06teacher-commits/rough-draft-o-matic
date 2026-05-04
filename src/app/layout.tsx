import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rough Draft-o-Matic',
  description: 'AI-powered essay feedback for students',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <div id="deploy-test" style={{display:'none'}}>DEPLOY-TEST-V1</div>
        {children}
      </body>
    </html>
  );
}
