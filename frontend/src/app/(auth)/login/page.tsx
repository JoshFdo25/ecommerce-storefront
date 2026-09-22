'use client';

import { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Turnstile } from '@marsidev/react-turnstile';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { FloatingInput } from '@/components/ui/floating-input';
import { LoginSchema, LoginFormData } from '@/lib/validations';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');
  const setAuth = useAuthStore((state) => state.setAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const getGuestSessionId = useCartStore((state) => state.getGuestSessionId);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (callbackUrl) {
      // If there's a callbackUrl, it means the middleware intercepted a protected route
      // and redirected here because the cookie was missing/expired. 
      // We should clear any stale Zustand state so the UI (like Avatar) correctly reflects the logged-out status.
      logout();
    } else if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router, callbackUrl, logout]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    if (!token) {
      toast.error('Please complete the captcha');
      return;
    }

    setIsLoading(true);
    try {
      const guestSessionId = getGuestSessionId();
      const payload = {
        ...data,
        guestSessionId: guestSessionId || undefined,
        cfToken: token, // Sent to backend if backend verifies Turnstile
      };

      const response = await apiClient.post('/auth/login', payload);
      
      setAuth(response.data.user);
      
      // Prevent Open Redirect attacks by ensuring the callbackUrl is a relative path
      const safeCallbackUrl = (callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')) 
        ? callbackUrl 
        : '/dashboard';
        
      // Use window.location.href to force a hard navigation.
      // This bypasses the Next.js client-side router cache, ensuring that the 
      // newly set cookie is sent to the server for the proxy.ts middleware to validate.
      toast.success('Successfully logged in!');
      window.location.href = safeCallbackUrl;
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-8"
    >
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
            Enter your email to sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <FloatingInput
              id="email"
              label="Email"
              type="email"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <FloatingInput
              id="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              endAdornment={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  )}
                  <span className="sr-only">
                    {showPassword ? 'Hide password' : 'Show password'}
                  </span>
                </Button>
              }
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
            <div className="flex justify-end pt-1">
              <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>

          <div className="flex justify-center py-2">
            <div className="w-[300px] h-[65px] relative">
              {!token && (
                <div className="absolute inset-0 bg-muted animate-pulse rounded-md pointer-events-none" />
              )}
              {isMounted && (
                <div className="absolute inset-0">
                  <Turnstile
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                    onSuccess={(token) => setToken(token)}
                    options={{ action: 'login' }}
                    scriptOptions={{ appendTo: 'body' }}
                  />
                </div>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={!isMounted ? false : (isLoading || !token)}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </div>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex h-[400px] items-center justify-center"><div className="animate-pulse">Loading...</div></div>}>
      <LoginContent />
    </Suspense>
  );
}
