import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import DOMPurify from 'isomorphic-dompurify';
import { formatCurrency } from '@/lib/utils';
import { AddToCartButton } from '@/components/product/AddToCartButton';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Truck, RotateCcw, ShieldCheck } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Fetch function to get product by slug directly from Node.js backend
async function getProduct(slug: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/catalog/products/${slug}`, {
      next: { revalidate: 60 }, // ISR: Revalidate every 60 seconds
    });
    
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error('Failed to fetch product');
    }
    
    return res.json();
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

// Generate SEO Metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  
  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }

  return {
    title: `${product.name} | E-Commerce Storefront`,
    description: product.description 
      ? product.description.replace(/<[^>]*>?/gm, '').substring(0, 160) 
      : 'View our amazing products.',
    openGraph: {
      title: product.name,
      description: product.description ? product.description.replace(/<[^>]*>?/gm, '').substring(0, 160) : '',
      images: Array.isArray(product.images) && product.images.length > 0 ? [{ url: product.images[0] }] : [],
    },
  };
}

export default async function ProductDetailsPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  // Safely sanitize the HTML using isomorphic-dompurify (works in Node.js)
  const sanitizedDescription = product.description 
    ? DOMPurify.sanitize(product.description)
    : '<p>No description available.</p>';

  // For simplicity without embla yet, just show the first image or a placeholder
  const imageUrl = Array.isArray(product.images) && product.images.length > 0 
    ? product.images[0] 
    : 'https://via.placeholder.com/600';

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-background pb-20">
      {/* Top Header & Breadcrumbs */}
      <div className="bg-background border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <nav className="flex items-center text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4 mx-1" />
            {product.category_name && product.category_slug && (
              <>
                <Link href={`/category/${product.category_slug}`} className="hover:text-primary cursor-pointer transition-colors">{product.category_name}</Link>
                <ChevronRight className="w-4 h-4 mx-1" />
              </>
            )}
            <span className="text-foreground font-medium line-clamp-1">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Product Images (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="aspect-square relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-100 shadow-sm">
              <Image 
                src={imageUrl} 
                alt={product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                priority
                className="object-cover"
              />
            </div>
            {Array.isArray(product.images) && product.images.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2 px-1">
                {product.images.map((img: string, idx: number) => (
                  <div key={idx} className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden border border-border cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                    <Image 
                      src={img} 
                      alt={`${product.name} ${idx + 1}`} 
                      fill 
                      sizes="96px"
                      className="object-cover" 
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Info & Actions (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            {product.category_name && (
              <span className="text-sm font-semibold tracking-wider uppercase text-muted-foreground mb-3">
                {product.category_name}
              </span>
            )}
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mb-4 leading-tight">
              {product.name}
            </h1>
            
            <div className="flex flex-col mb-6">
              <div className="text-3xl font-bold text-zinc-900 dark:text-white">
                {formatCurrency(product.price)}
              </div>
              <span className="text-sm text-muted-foreground mt-1">Shipping calculated at checkout</span>
            </div>

            <div className="flex items-center gap-2 mb-8">
              {product.stock_quantity > 0 ? (
                <>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    In Stock & Ready to Ship
                  </span>
                </>
              ) : (
                <span className="text-sm font-medium text-destructive">
                  Out of Stock
                </span>
              )}
            </div>

            <div className="mb-8">
              <div 
                className="prose prose-zinc prose-sm sm:prose-base dark:prose-invert max-w-none text-muted-foreground leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
              />
            </div>

            <div className="border-t border-border/60 pt-2 pb-8">
              <AddToCartButton product={product} />
            </div>

            {/* Trust / Value Props Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 py-6 border-y border-border/60">
              <div className="flex flex-col items-center text-center gap-2">
                <Truck className="w-6 h-6 text-muted-foreground" />
                <div className="text-sm font-medium">Free Shipping</div>
                <div className="text-xs text-muted-foreground">Orders over $100</div>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <RotateCcw className="w-6 h-6 text-muted-foreground" />
                <div className="text-sm font-medium">30-Day Guarantee</div>
                <div className="text-xs text-muted-foreground">Hassle-free returns</div>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <ShieldCheck className="w-6 h-6 text-muted-foreground" />
                <div className="text-sm font-medium">2-Year Warranty</div>
                <div className="text-xs text-muted-foreground">Full coverage</div>
              </div>
            </div>

            {/* Specifications Accordion */}
            <Accordion className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-base font-medium">Product Specifications</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Engineered with premium materials for durability and performance. Designed to meet the highest standards of quality assurance.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-base font-medium">Shipping & Delivery</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Orders are processed within 24 hours. Standard shipping takes 3-5 business days. Express options available at checkout.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-base font-medium">Care Instructions</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Wipe clean with a damp cloth. Do not use harsh chemicals or abrasives. Store in a cool, dry place when not in use.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>
    </div>
  );
}
