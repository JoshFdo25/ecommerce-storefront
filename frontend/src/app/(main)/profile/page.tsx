'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PersonalInfo } from '@/components/profile/personal-info';
import { OrderHistory } from '@/components/profile/order-history';

function ProfileContent() {
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get('onboarding') === 'true';
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (isOnboarding) {
      setShowBanner(true);
    }
  }, [isOnboarding]);

  const dismissBanner = () => {
    setShowBanner(false);
    // Remove the query param from URL without refreshing the page
    window.history.replaceState({}, '', window.location.pathname);
  };
  return (
    <div className="container mx-auto py-10 px-4 max-w-5xl space-y-6">
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between relative mb-2">
              <div className="flex gap-4 items-start sm:items-center">
                <div className="bg-primary/20 p-3 rounded-full hidden sm:block shrink-0">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-primary">Welcome aboard! 🎉</h3>
                  <p className="text-sm text-foreground mt-1">
                    Fill in your shipping address and personal details below to unlock a lightning-fast checkout experience on your future orders.
                  </p>
                </div>
              </div>
              <button 
                onClick={dismissBanner}
                className="absolute top-4 right-4 sm:static sm:top-auto sm:right-auto p-2 hover:bg-primary/20 rounded-full transition-colors shrink-0"
                aria-label="Dismiss message"
              >
                <X className="h-4 w-4 text-primary" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <h1 className="text-3xl font-bold mb-8">My Profile</h1>
      
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2 sm:inline-flex sm:w-fit h-10">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="orders">Order History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="personal" className="space-y-8">
          <PersonalInfo />
        </TabsContent>
        
        <TabsContent value="orders">
          <OrderHistory />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="container mx-auto py-10 px-4 max-w-5xl animate-pulse"><div className="h-10 w-48 bg-muted rounded mb-8"></div><div className="h-[400px] bg-muted/50 rounded-lg"></div></div>}>
      <ProfileContent />
    </Suspense>
  );
}
