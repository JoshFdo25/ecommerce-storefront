'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/button';

export function MobileMenu({ categories = [], isAuthenticated, user, handleLogout }: any) {
  const [isOpen, setIsOpen] = useState(false);

  // Prevent scrolling when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const itemVariants = {
    closed: { opacity: 0, y: 20 },
    open: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <>
      {/* Toggle Button - z-[60] keeps it above the fullscreen menu overlay */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="md:hidden relative z-[60]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="h-5 w-5" />
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Menu className="h-5 w-5" />
            </motion.div>
          )}
        </AnimatePresence>
        <span className="sr-only">Menu</span>
      </Button>

      {/* Fullscreen Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-3xl flex flex-col justify-center items-center overflow-hidden"
            initial={{ clipPath: 'circle(0% at calc(100% - 32px) 32px)' }}
            animate={{ clipPath: 'circle(150% at calc(100% - 32px) 32px)' }}
            exit={{ clipPath: 'circle(0% at calc(100% - 32px) 32px)' }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          >
            <div className="container px-8 w-full max-w-md mx-auto flex flex-col gap-8 h-full justify-center">
              {/* Menu Items Container with Stagger */}
              <motion.div 
                className="flex flex-col gap-6"
                initial="closed"
                animate="open"
                exit="closed"
                variants={{
                  open: {
                    transition: { staggerChildren: 0.07, delayChildren: 0.15 }
                  },
                  closed: {
                    transition: { staggerChildren: 0.05, staggerDirection: -1 }
                  }
                }}
              >
                {/* Categories */}
                <div className="flex flex-col gap-5">
                  <motion.h4 
                    variants={itemVariants} 
                    className="font-semibold text-xs text-muted-foreground uppercase tracking-widest mb-1"
                  >
                    Categories
                  </motion.h4>
                  {categories.map((category: any) => (
                    <motion.div key={category.id} variants={itemVariants}>
                      <Link 
                        href={`/category/${category.slug}`}
                        className="text-3xl sm:text-4xl font-bold text-foreground hover:text-primary transition-colors block"
                        onClick={() => setIsOpen(false)}
                      >
                        {category.name}
                      </Link>
                    </motion.div>
                  ))}
                </div>
                
                <motion.div variants={itemVariants} className="w-full h-px bg-border my-2" />
                
                {/* Account / Actions */}
                <div className="flex flex-col gap-5">
                  {isAuthenticated ? (
                    <>
                      <motion.div variants={itemVariants}>
                        <Link 
                          href="/profile" 
                          className="text-3xl sm:text-4xl font-bold text-foreground hover:text-primary transition-colors block"
                          onClick={() => setIsOpen(false)}
                        >
                          Profile
                        </Link>
                      </motion.div>
                      {user?.role !== 'customer' && (
                        <motion.div variants={itemVariants}>
                          <Link 
                            href="/dashboard" 
                            className="text-3xl sm:text-4xl font-bold text-foreground hover:text-primary transition-colors block"
                            onClick={() => setIsOpen(false)}
                          >
                            Dashboard
                          </Link>
                        </motion.div>
                      )}
                      <motion.div variants={itemVariants}>
                        <button 
                          onClick={() => {
                            handleLogout();
                            setIsOpen(false);
                          }}
                          className="text-3xl sm:text-4xl font-bold text-foreground hover:text-primary transition-colors block text-left"
                        >
                          Log out
                        </button>
                      </motion.div>
                    </>
                  ) : (
                    <>
                      <motion.div variants={itemVariants}>
                        <Link 
                          href="/login" 
                          className="text-3xl sm:text-4xl font-bold text-foreground hover:text-primary transition-colors block"
                          onClick={() => setIsOpen(false)}
                        >
                          Log in
                        </Link>
                      </motion.div>
                      <motion.div variants={itemVariants}>
                        <Link 
                          href="/register" 
                          className="text-3xl sm:text-4xl font-bold text-foreground hover:text-primary transition-colors block"
                          onClick={() => setIsOpen(false)}
                        >
                          Sign up
                        </Link>
                      </motion.div>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
