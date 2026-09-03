'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Turnstile } from '@marsidev/react-turnstile';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { FloatingInput } from '@/components/ui/floating-input';
import { ForgotPasswordSchema, ForgotPasswordFormData } from '@/lib/validations';
import { apiClient } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(ForgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    if (!token) {
      toast.error('Please complete the captcha');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        ...data,
        cfToken: token,
      };

      await apiClient.post('/auth/forgot-password', payload);
      
      setIsSubmitted(true);
      toast.success('Reset link sent!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send reset link');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex min-h-[calc(100vh-140px)] items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 rounded-xl border bg-card p-8 shadow-sm text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              If an account exists for that email, we've sent instructions to reset your password.
            </p>
          </div>
          <div className="pt-4">
            <Link href="/login" className="font-medium text-primary hover:underline">
              Return to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-8"
    >
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Reset password</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email address and we'll send you a link to reset your password.
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
                  />
                </div>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={!isMounted ? false : (isLoading || !token)}>
            {isLoading ? 'Sending link...' : 'Send Reset Link'}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          Remember your password?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </div>
    </motion.div>
  );
}
