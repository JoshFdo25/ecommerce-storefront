'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Command } from 'lucide-react';
import { InstantSearch, useSearchBox, useHits } from 'react-instantsearch';
import { searchClient } from '@/lib/search';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import Image from 'next/image';
import Link from 'next/link';

function CustomSearchBox({ 
  onClose,
  onSubmit 
}: { 
  onClose: () => void;
  onSubmit: (query: string) => void;
}) {
  const { query, refine } = useSearchBox();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    // Small timeout ensures the sheet is fully mounted before focusing
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <form 
      className="relative flex items-center border-b border-border/40 pb-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (query.trim()) {
          onSubmit(query);
          onClose();
        }
      }}
    >
      <Search className="absolute left-4 w-5 h-5 text-muted-foreground" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => refine(e.currentTarget.value)}
        placeholder="Search for products..."
        className="w-full pl-12 pr-4 py-3 bg-transparent border-none text-lg font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-0"
      />
      <div className="absolute right-4 text-xs font-medium text-muted-foreground flex items-center gap-1 bg-muted px-2 py-1 rounded">
        <span>Enter</span>
        <span>to search</span>
      </div>
    </form>
  );
}

function CustomHits({ 
  onClose, 
  onViewAll 
}: { 
  onClose: () => void;
  onViewAll: (query: string) => void;
}) {
  const { hits } = useHits();
  const { query } = useSearchBox();

  if (query.trim().length < 4) {
    return (
      <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center">
        <Search className="w-8 h-8 mb-4 opacity-20" />
        <p className="font-medium text-sm">
          {query.trim().length === 0 
            ? "Start typing to search products..." 
            : "Please enter at least 4 characters..."}
        </p>
      </div>
    );
  }

  if (hits.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center">
        <p className="font-medium text-sm">No products found matching '{query}'</p>
      </div>
    );
  }

  return (
    <div className="py-4 flex flex-col gap-2">
      <div className="max-h-[60vh] overflow-y-auto flex flex-col gap-2 pr-2">
        {hits.map((hit: any) => {
          const imageUrl = Array.isArray(hit.images) && hit.images.length > 0
            ? hit.images[0]
            : 'https://via.placeholder.com/400';

          return (
            <Link 
              key={hit.objectID} 
              href={`/product/${hit.slug}`}
              onClick={onClose}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <div className="relative w-12 h-12 rounded bg-zinc-100 flex-shrink-0 overflow-hidden border border-border/50">
                <Image
                  src={imageUrl}
                  alt={hit.name}
                  fill
                  sizes="48px"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="flex-1 min-w-0">
                {hit.category_name && (
                  <p className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground mb-0.5">
                    {hit.category_name}
                  </p>
                )}
                <h4 className="font-semibold text-foreground text-sm truncate">{hit.name}</h4>
              </div>
              <div className="flex flex-col items-end flex-shrink-0">
                <span className="font-bold text-sm">{formatCurrency(hit.price)}</span>
                {hit.stock_quantity > 0 ? (
                  <span className="text-[10px] font-medium text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-sm mt-1">In Stock</span>
                ) : (
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm mt-1">Out of Stock</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
      <Button 
        variant="ghost" 
        className="mt-4 w-full text-muted-foreground hover:text-foreground"
        onClick={() => {
          onViewAll(query);
          onClose();
        }}
      >
        View all results for "{query}" &rarr;
      </Button>
    </div>
  );
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Keyboard shortcut listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSearchSubmit = (query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={
        <Button variant="outline" className="hidden md:flex relative h-9 w-full justify-start rounded-[0.5rem] bg-background text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64 border-border/60 hover:bg-muted/50 hover:text-foreground transition-all">
          <span className="hidden lg:inline-flex">Search products...</span>
          <span className="inline-flex lg:hidden">Search...</span>
          <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      } />
      
      {/* Mobile trigger */}
      <SheetTrigger render={
        <Button variant="ghost" size="icon" className="md:hidden">
          <Search className="h-5 w-5" />
          <span className="sr-only">Search</span>
        </Button>
      } />

      <SheetContent side="top" className="w-full sm:max-w-3xl mx-auto p-4 sm:p-6 rounded-b-2xl max-h-[85vh] overflow-y-auto" showCloseButton={true}>
        <InstantSearch searchClient={searchClient} indexName="products">
          <div className="flex flex-col gap-2 mt-4 sm:mt-0">
            <CustomSearchBox 
              onClose={() => setOpen(false)} 
              onSubmit={handleSearchSubmit} 
            />
            <CustomHits 
              onClose={() => setOpen(false)} 
              onViewAll={handleSearchSubmit} 
            />
          </div>
        </InstantSearch>
      </SheetContent>
    </Sheet>
  );
}
