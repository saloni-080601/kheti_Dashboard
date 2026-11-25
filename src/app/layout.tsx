'use client';

import React, { useState } from 'react';
import './globals.css';
import { FarmProvider } from '@/context/FarmContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <html lang="en">
      <head>
        <title>Kheti Manager – Complete Farm Management System</title>
        <meta
          name="description"
          content="Comprehensive farm, land, crop, labour, machinery, irrigation, and financial management for farmers."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-[#f3faf5] flex flex-col font-sans">
        <FarmProvider>
          <div className="flex flex-1 min-h-screen">
            {/* Sidebar */}
            <Sidebar
              isOpen={mobileMenuOpen}
              onClose={() => setMobileMenuOpen(false)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col md:pl-64 min-w-0">
              <Header onMobileMenuToggle={() => setMobileMenuOpen(true)} />
              <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
                {children}
              </main>
            </div>
          </div>
        </FarmProvider>
      </body>
    </html>
  );
}
