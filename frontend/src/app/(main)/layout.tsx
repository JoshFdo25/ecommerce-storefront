import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

async function getCategories() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/catalog/categories`, {
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    if (!res.ok) throw new Error('Failed to fetch categories');
    return await res.json();
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

import { CartSheet } from "@/components/cart/CartSheet";

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const categories = await getCategories();

  return (
    <>
      <Header categories={categories} />
      <CartSheet />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
