import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import AuthModal from "@/components/auth/AuthModal";

export const metadata: Metadata = {
  title: "KASHVI | Haute Couture & Royal Vault Jewellery",
  description: "Luxury fashion and handcrafted royal jewellery platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-neutral-900">
        <AuthProvider>
          <CartProvider>
            {children}
            <AuthModal />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}