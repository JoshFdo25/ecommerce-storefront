'use client';

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

const CAROUSEL_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1470&auto=format&fit=crop",
    title: "Discover Premium Quality",
    subtitle: "Shop the best selection of curated products from around the world.",
  },
  {
    src: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1470&auto=format&fit=crop",
    title: "Fast & Secure Checkout",
    subtitle: "Experience a seamless shopping journey with top-tier security.",
  },
  {
    src: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1470&auto=format&fit=crop",
    title: "Join Our Community",
    subtitle: "Create an account to track orders, save favorites, and unlock rewards.",
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full">
      {/* Left Pane - Image Carousel (Hidden on mobile, 50% width on desktop) */}
      <div className="hidden lg:block w-1/2 relative bg-zinc-900">
        <Carousel
          plugins={[
            Autoplay({
              delay: 5000,
            }),
          ]}
          opts={{
            loop: true,
          }}
          className="w-full h-full"
        >
          <CarouselContent className="h-screen m-0">
            {CAROUSEL_IMAGES.map((image, index) => (
              <CarouselItem key={index} className="relative h-full w-full p-0">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${image.src})` }}
                />
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 text-white select-none">
                  <h2 className="text-4xl font-bold mb-4 tracking-tight">{image.title}</h2>
                  <p className="text-lg text-zinc-200 max-w-md">{image.subtitle}</p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      {/* Right Pane - Auth Forms (100% width on mobile, 50% width on desktop) */}
      <div className="w-full lg:w-1/2 relative flex flex-col justify-center bg-background min-h-screen">
        {/* UX Escape Hatch */}
        <Link
          href="/"
          className="absolute top-6 left-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Store
        </Link>

        {/* Container gracefully centers vertically and horizontally */}
        <div className="w-full max-w-md mx-auto p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
