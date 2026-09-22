'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, User, Menu, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { useCartStore } from '../../store/cart';
import { useAuthStore } from '../../store/auth';
import { Button, buttonVariants } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { GlobalSearch } from './GlobalSearch';
import { MobileMenu } from './MobileMenu';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Header({ categories = [] }: { categories?: any[] }) {
  const { items, setIsOpen, fetchCart } = useCartStore();
  const { isAuthenticated, user, logout } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const megaMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        megaMenuRef.current && !megaMenuRef.current.contains(target)
      ) {
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
    fetchCart();
  }, [fetchCart]);

  const totalItems = items.length;

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* 1. Invisible Overlay (z-20) */}
      {isMegaMenuOpen && (
        <div
          className="fixed inset-0 top-16 z-20 bg-transparent"
          onClick={(e) => {
            e.stopPropagation();
            setIsMegaMenuOpen(false);
          }}
        />
      )}

      {/* 2. Mega Menu Dropdown (z-30) */}
      <div
        ref={megaMenuRef}
        className={`absolute top-16 left-0 w-full bg-neutral-950/90 supports-[backdrop-filter]:bg-neutral-950/70 backdrop-filter backdrop-blur-2xl border-b border-zinc-800 shadow-2xl transition-all duration-500 ease-in-out z-30 ${isMegaMenuOpen ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-full invisible pointer-events-none'}`}
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

      {/* 3. Header background layer (z-40) */}
      <div className="absolute inset-0 w-full h-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pointer-events-none z-40" />

      {/* 4. Header content (z-50) */}
      <div className="container mx-auto px-4 h-16 flex items-center justify-between relative z-50">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl tracking-tight text-primary">Storefront</span>
          </Link>
          <nav className="hidden md:flex h-full items-center static">
            <div className="h-full flex items-center" ref={buttonRef}>
              <button
                onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)}
                className={`text-sm font-medium transition-colors flex items-center gap-1 h-full px-4 font-sans ${isMegaMenuOpen ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
              >
                Categories
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isMegaMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <GlobalSearch />

          <Button variant="ghost" size="icon" className="relative" onClick={() => setIsOpen(true)}>
            <ShoppingCart className="h-5 w-5" />
            <AnimatePresence mode="popLayout">
              {mounted && totalItems > 0 && (
                <motion.div
                  key={totalItems}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  className="absolute -top-1 -right-1"
                >
                  <Badge
                    variant="destructive"
                    className="h-5 w-5 flex items-center justify-center p-0 text-[10px]"
                  >
                    {totalItems}
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
            <span className="sr-only">Cart</span>
          </Button>

          {mounted && isAuthenticated ? (
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="rounded-full" />}>
                  {user?.avatarUrl ? (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatarUrl} alt="User Avatar" />
                      <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-2">
                        <p className="text-xs leading-none text-muted-foreground">
                          Welcome back,
                        </p>
                        <p className="text-sm font-medium leading-none">
                          {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User'}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<Link href="/profile" className="w-full cursor-pointer" />}>
                    Profile Settings
                  </DropdownMenuItem>
                  {user?.role !== 'customer' && (
                    <DropdownMenuItem render={<Link href="/dashboard" className="w-full cursor-pointer" />}>
                      Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500 cursor-pointer">
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
