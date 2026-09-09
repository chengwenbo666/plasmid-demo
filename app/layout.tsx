import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Plasmid Sketch｜质粒示意图生成器',
  description: '上传 SnapGene .dna 文件，生成适合科研小图的可编辑 SVG 质粒示意图。',
  metadataBase: new URL('https://plasmid-sketch.sharp-lion-0035.chatgpt.site'),
  openGraph: {
    title: 'Plasmid Sketch｜质粒示意图生成器',
    description: '上传 SnapGene .dna 文件，生成适合科研小图的可编辑 SVG 质粒示意图。',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Plasmid Sketch｜质粒示意图生成器',
    description: '上传 SnapGene .dna 文件，生成适合科研小图的可编辑 SVG 质粒示意图。',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
