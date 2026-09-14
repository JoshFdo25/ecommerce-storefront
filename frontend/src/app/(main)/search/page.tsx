'use client';

import { useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  InstantSearch,
  Hits,
  Pagination,
  RefinementList,
  SortBy,
  ClearRefinements,
  Configure,
  useInstantSearch,
  DynamicWidgets,
} from 'react-instantsearch';
import { searchClient } from '@/lib/search';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Filter, ChevronRight, Search, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

// Use pure Tailwind styling

function Hit({ hit }: { hit: any }) {
  const imageUrl = Array.isArray(hit.images) && hit.images.length > 0
    ? hit.images[0]
    : 'https://via.placeholder.com/400';

  return (
    <Link href={`/product/${hit.slug}`} className="group block h-full">
      <div className="border border-border/50 rounded-2xl overflow-hidden bg-card transition-all duration-300 hover:shadow-md hover:-translate-y-1 h-full flex flex-col relative">
        {hit.stock_quantity > 0 && (
          <div className="absolute top-3 left-3 z-10 bg-emerald-500/10 text-emerald-600 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md border border-emerald-500/20">
            In Stock
          </div>
        )}
        <div className="aspect-square relative overflow-hidden bg-zinc-100 rounded-t-2xl">
          <Image
            src={imageUrl}
            alt={hit.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        </div>
        <div className="p-5 flex flex-col flex-grow justify-between">
          <div>
            {hit.category_name && (
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1 block">
                {hit.category_name}
              </span>
            )}
            <h3 className="font-semibold text-foreground line-clamp-1">{hit.name}</h3>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <span className="text-xl font-bold text-zinc-900 dark:text-white">
              {formatCurrency(hit.price)}
            </span>
            <div className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium py-2.5 rounded-lg text-center opacity-90 group-hover:opacity-100 transition-opacity">
              View Details
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ProductSkeleton() {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card h-full flex flex-col animate-pulse">
      <div className="aspect-square relative bg-muted" />
      <div className="p-4 flex flex-col flex-grow justify-between">
        <div>
          <div className="h-6 bg-muted/60 rounded w-3/4 mb-3" />
          <div className="h-4 bg-muted/60 rounded w-full mb-1" />
          <div className="h-4 bg-muted/60 rounded w-5/6" />
        </div>
        <div className="mt-4">
          <div className="h-6 bg-muted/60 rounded w-1/4" />
        </div>
      </div>
    </div>
  );
}

function HitsWrapper() {
  const { status, results } = useInstantSearch();
  const isLoading = status === 'loading' || status === 'stalled';
  const hasNoResults = !isLoading && results && results.nbHits === 0;

  // Scroll to top when page changes
  const prevPageRef = useRef(results?.page);
  useEffect(() => {
    if (results && results.page !== prevPageRef.current) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      prevPageRef.current = results.page;
    }
  }, [results?.page, results]);

  return (
    <>
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      )}

      {hasNoResults && (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border/50 rounded-2xl">
          <Search className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-xl font-semibold mb-2">No products found</h2>
          <p className="text-muted-foreground">Try adjusting your filters or search query.</p>
        </div>
      )}

      <div className={isLoading || hasNoResults ? 'hidden' : 'block'}>
        <Hits
          hitComponent={Hit}
          classNames={{
            list: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
            item: 'h-full'
          }}
        />
      </div>
    </>
  );
}

function CustomRefinementList(props: any) {
  return (
    <div className="mb-6">
      <h4 className="font-medium text-sm text-muted-foreground mb-4 uppercase tracking-wider">{props.attribute.replace(/_/g, ' ')}</h4>
      <RefinementList
        {...props}
        classNames={{
          list: 'space-y-3',
          item: 'flex items-center gap-3 text-sm',
          label: 'flex flex-1 items-center gap-3 cursor-pointer group',
          checkbox: 'h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 accent-zinc-900 cursor-pointer',
          labelText: 'text-foreground font-medium group-hover:text-zinc-600 transition-colors capitalize',
          count: 'ml-auto text-xs text-muted-foreground bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-full font-medium'
        }}
      />
    </div>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-background">
      {/* Top Header & Breadcrumbs */}
      <div className="bg-background border-b border-border/40">
        <div className="container mx-auto px-4 py-8">
          <nav className="flex items-center text-sm text-muted-foreground mb-4">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span className="text-foreground font-medium">Search</span>
          </nav>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Search results for "{query}"
          </h1>
        </div>
      </div>

      <InstantSearch
        searchClient={searchClient}
        indexName="products"
        initialUiState={{
          products: {
            query: query,
          },
        }}
      >
        {/* @ts-expect-error hitsPerPage is a valid search parameter but TS types are overly strict here */}
        <Configure hitsPerPage={12} query={query} />
        {/* Sticky Sort Bar */}
        <div className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border/40 py-4 shadow-sm">
          <div className="container mx-auto px-4 flex justify-end items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Sort by:</span>
              <SortBy
                items={[
                  { label: 'Relevance', value: 'products' },
                  { label: 'Price: Low to High', value: 'products_price_asc' },
                  { label: 'Price: High to Low', value: 'products_price_desc' },
                ]}
                classNames={{
                  root: 'w-64',
                  select: 'flex h-11 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary',
                }}
              />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Mobile Filter Button (Sheet) */}
            <div className="md:hidden mb-4">
              <Sheet>
                <SheetTrigger render={
                  <Button variant="outline" className="w-full flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filters
                  </Button>
                } />
                <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                  <SheetTitle className="mb-4">Filters</SheetTitle>
                  <div className="space-y-6">
                    <DynamicWidgets fallbackComponent={CustomRefinementList} />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop Sidebar */}
            <aside className="hidden md:block w-64 flex-shrink-0">
              <div className="sticky top-28 bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-lg">Filters</h3>
                  <ClearRefinements
                    translations={{ resetButtonText: 'Reset' }}
                    classNames={{
                      button: 'text-xs font-medium text-muted-foreground hover:text-primary transition-colors disabled:opacity-50',
                    }}
                  />
                </div>

                <div className="space-y-6">
                  <DynamicWidgets fallbackComponent={CustomRefinementList} />
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1">
              <div className="mb-8">
                <HitsWrapper />
              </div>

              <div className="mt-8 flex justify-center">
                <Pagination
                  classNames={{
                    list: 'flex items-center rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50 dark:bg-zinc-900/50',
                    item: 'flex items-center justify-center border-r border-zinc-200 dark:border-zinc-800 last:border-r-0',
                    selectedItem: 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900',
                    link: 'w-12 h-12 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-medium',
                    disabledItem: 'opacity-30 pointer-events-none'
                  }}
                />
              </div>
            </main>
          </div>
        </div>
      </InstantSearch>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50/50 dark:bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
