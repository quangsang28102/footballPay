import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin", "vietnamese"],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "Football Payment Manager",
  description: "Quản lý chia tiền đá banh sau mỗi trận đấu",
  icons: {
    icon: "https://assets.manutd.com/AssetPicker/images/0/0/3/2/197240/Header-Logo1500994616801.png",
  },
};

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from '@/context/AuthContext';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${inter.variable} font-sans antialiased text-white`}>
        <AuthProvider>
          {children}
          <ToastContainer position="top-right" theme="dark" autoClose={3000} />
        </AuthProvider>
      </body>
    </html>
  );
}
