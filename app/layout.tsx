import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PDP Vault — Prove your file is really on Filecoin',
  description:
    'Upload a file and get a shareable link that shows real on-chain Provable Data Possession (PDP) proof that your file is still stored on Filecoin.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
