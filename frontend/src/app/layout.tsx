import React from 'react';
import './globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export const metadata = {
  title: 'AI PR Review Platform | Autonomous Code Intelligence & Security',
  description:
    'Production-grade automated GitHub Pull Request review platform powered by AST static analysis, AI inspection, BullMQ queues, and GitHub Checks.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dark-900 text-dark-100 flex flex-col min-h-screen antialiased selection:bg-brand-500/30 selection:text-brand-200">
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
