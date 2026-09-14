'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, User, Menu, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { useCartStore } from '../../store/cart';
import { useAuthStore } from '../../store/auth';
import { Button, buttonVariants } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { GlobalSearch } from './GlobalSearch';
import { MobileMenu } from './MobileMenu';
import { useEffect, useState, useRef } from 'react';

export function Header({ categories = [] }: { categories?: any[] }) {
  const { items, setIsOpen } = useCartStore();
  const { isAuthenticated, user, logout } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMegaMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Header background layer - separated so it doesn't block child backdrop filters */}
      <div className="absolute inset-0 w-full h-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pointer-events-none -z-10" />

      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl tracking-tight text-primary">Storefront</span>
          </Link>
          <nav className="hidden md:flex h-full items-center static">
            <div className="h-full flex items-center" ref={menuRef}>
              <button
                onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)}
                className={`text-sm font-medium transition-colors flex items-center gap-1 h-full px-4 font-sans ${isMegaMenuOpen ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
              >
                Categories
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isMegaMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Invisible Overlay to block clicks on page content */}
              {isMegaMenuOpen && (
                <div 
                  className="fixed inset-0 top-16 z-40 bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMegaMenuOpen(false);
                  }}
                />
              )}

              {/* Mega Menu Dropdown */}
              <div
                className={`absolute top-16 left-0 w-full bg-neutral-950/90 supports-[backdrop-filter]:bg-neutral-950/70 backdrop-filter backdrop-blur-2xl border-b border-zinc-800 shadow-2xl transition-all duration-300 z-50 ${isMegaMenuOpen ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-4 invisible pointer-events-none'}`}
              >
                <div className="container mx-auto px-4 py-8">
                  <div className="flex gap-4 overflow-x-auto pt-2 pb-6 custom-scrollbar">
                    {categories.length > 0 ? (
                      categories.map((category) => (
                        <Link
                          key={category.id}
                          href={`/category/${category.slug}`}
                          onClick={() => setIsMegaMenuOpen(false)}
                          className="flex flex-col items-center gap-3 min-w-[120px] group/card flex-shrink-0"
                        >
                          <div className="relative w-[120px] h-[120px] rounded-2xl overflow-hidden bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg border-2 border-transparent group-hover/card:border-orange-500 transition-all duration-300 group-hover/card:-translate-y-2">
                            {category.imageUrl ? (
                              <Image
                                src={category.imageUrl}
                                alt={category.name}
                                fill
                                className="object-cover p-2 scale-100 group-hover/card:scale-110 transition-transform duration-500 ease-out drop-shadow-xl"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-white/90 text-sm font-semibold font-sans">No Image</div>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-zinc-300 group-hover/card:text-white transition-colors text-center font-sans">
                            {category.name}
                          </span>
                        </Link>
                      ))
                    ) : (
                      <div className="text-zinc-500 text-sm py-8 w-full text-center font-sans">No categories available.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <GlobalSearch />

          {mounted && isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
                <User className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem render={<Link href="/profile" />}>
                  Profile
                </DropdownMenuItem>
                {user?.role !== 'customer' && (
                  <DropdownMenuItem render={<Link href="/dashboard" />}>
                    Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleLogout}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : mounted ? (
            <div className="hidden md:flex gap-2">
              <Link href="/login" className={buttonVariants({ variant: 'ghost' })}>
                Log in
              </Link>
              <Link href="/register" className={buttonVariants()}>
                Sign up
              </Link>
            </div>
          ) : (
            <div className="w-20 h-10"></div>
          )}

          <Button variant="ghost" size="icon" className="relative" onClick={() => setIsOpen(true)}>
            <ShoppingCart className="h-5 w-5" />
            {mounted && totalItems > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
              >
                {totalItems}
              </Badge>
            )}
            <span className="sr-only">Cart</span>
          </Button>

          <MobileMenu 
            categories={categories}
            isAuthenticated={isAuthenticated}
            user={user}
            handleLogout={handleLogout}
          />
        </div>
      </div>
    </header>
  );
}
