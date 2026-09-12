import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import DOMPurify from 'isomorphic-dompurify';
import { formatCurrency } from '@/lib/utils';
import { AddToCartButton } from '@/components/product/AddToCartButton';
import Image from 'next/image';

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
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Product Images */}
        <div className="flex flex-col gap-4">
          <div className="aspect-square relative rounded-2xl overflow-hidden border border-border bg-muted">
            <Image 
              src={imageUrl} 
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
              className="object-cover"
            />
          </div>
          {/* If there are multiple images, display a small gallery below */}
          {Array.isArray(product.images) && product.images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {product.images.map((img: string, idx: number) => (
                <div key={idx} className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-border">
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

        {/* Product Info */}
        <div className="flex flex-col">
          {product.category_name && (
            <span className="text-sm font-medium text-primary mb-2">
              {product.category_name}
            </span>
          )}
          <h1 className="text-4xl font-bold text-foreground mb-4">{product.name}</h1>
          
          <div className="text-3xl font-bold text-foreground mb-8">
            {formatCurrency(product.price)}
          </div>

          <div className="mb-8">
            {/* Sanitize HTML on the server and use Tailwind Typography plugin to style it */}
            <div 
              className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
            />
          </div>

          <div className="mt-auto border-t border-border pt-8">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm text-muted-foreground">Availability:</span>
              {product.stock_quantity > 0 ? (
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  In Stock ({product.stock_quantity})
                </span>
              ) : (
                <span className="text-sm font-medium text-destructive">
                  Out of Stock
                </span>
              )}
            </div>

            {/* Client Component for Interactivity */}
            <AddToCartButton product={product} />
          </div>
        </div>
      </div>
    </div>
  );
}
