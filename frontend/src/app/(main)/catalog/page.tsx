'use client';

import { 
  InstantSearch, 
  SearchBox, 
  Hits, 
  RefinementList, 
  Pagination,
  useInstantSearch
} from 'react-instantsearch';
import { searchClient } from '@/lib/search';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Filter } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

// Use basic InstantSearch styles to start, but Tailwind will override
import 'instantsearch.css/themes/satellite.css';

function Hit({ hit }: { hit: any }) {
  const imageUrl = Array.isArray(hit.images) && hit.images.length > 0 
    ? hit.images[0] 
    : 'https://via.placeholder.com/400';

  return (
    <Link href={`/product/${hit.slug}`} className="group block h-full">
      <div className="border border-border rounded-xl overflow-hidden bg-card transition-all duration-300 hover:shadow-lg hover:border-primary/50 h-full flex flex-col">
        <div className="aspect-square relative overflow-hidden bg-muted">
          <Image 
            src={imageUrl} 
            alt={hit.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="p-4 flex flex-col flex-grow justify-between">
          <div>
            <h3 className="font-semibold text-lg text-card-foreground line-clamp-1">{hit.name}</h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {hit.description ? hit.description.replace(/<[^>]*>?/gm, '') : 'No description available'}
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-lg font-bold text-primary">
              {formatCurrency(hit.price)}
            </span>
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
  const { status } = useInstantSearch();
  const isLoading = status === 'loading' || status === 'stalled';

  return (
    <>
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      )}
      
      <div className={isLoading ? 'hidden' : 'block'}>
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

export default function CatalogPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Catalog</h1>

      <InstantSearch searchClient={searchClient} indexName="products">
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
                  <div>
                    <h3 className="font-semibold mb-3">Categories</h3>
                    <RefinementList attribute="category_name" />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            <div className="space-y-6 sticky top-24">
              <div>
                <h3 className="font-semibold mb-3 text-lg">Categories</h3>
                <RefinementList 
                  attribute="category_name" 
                  classNames={{
                    list: 'space-y-2',
                    item: 'flex items-center gap-2 text-sm',
                    label: 'flex items-center gap-2 cursor-pointer',
                    checkbox: 'rounded border-input text-primary focus:ring-primary',
                    count: 'ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full'
                  }}
                />
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="mb-6">
              <SearchBox 
                classNames={{
                  root: 'w-full',
                  form: 'relative flex items-center',
                  input: 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                  submit: 'hidden',
                  reset: 'hidden',
                }}
                placeholder="Search products..." 
              />
            </div>

            <div className="mt-8">
              <HitsWrapper />
            </div>

            <div className="mt-12 flex justify-center">
              <Pagination 
                classNames={{
                  list: 'flex items-center gap-2',
                  item: 'w-10 h-10 flex items-center justify-center rounded-md border border-input hover:bg-muted transition-colors',
                  selectedItem: 'bg-primary text-primary-foreground border-primary hover:bg-primary/90',
                  link: 'w-full h-full flex items-center justify-center'
                }}
              />
            </div>
          </main>
        </div>
      </InstantSearch>
    </div>
  );
}
