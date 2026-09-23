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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { RegisterSchema, RegisterFormData } from '@/lib/validations';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';

function RegisterContent() {
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
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [registeredEmail, setRegisteredEmail] = useState<string>('');
  const [otpValue, setOtpValue] = useState('');

  useEffect(() => {
    setIsMounted(true);
    if (callbackUrl) {
      logout();
    } else if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router, callbackUrl, logout]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(RegisterSchema),
    mode: 'onChange',
  });

  const password = watch('password') || '';
  const hasMinLength = password.length >= 8;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  const satisfiedCount = [hasMinLength, hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  let strengthColor = 'bg-muted';
  if (satisfiedCount === 5) strengthColor = 'bg-green-500';
  else if (satisfiedCount >= 3) strengthColor = 'bg-yellow-500';
  else if (satisfiedCount > 0) strengthColor = 'bg-red-500';

  const getMissingRequirements = () => {
    const missing = [];
    if (!hasMinLength) missing.push('8 characters');
    if (!hasUpper) missing.push('uppercase letter');
    if (!hasLower) missing.push('lowercase letter');
    if (!hasNumber) missing.push('number');
    if (!hasSpecial) missing.push('special character');
    return missing;
  };

  const missingReqs = getMissingRequirements();

  const onSubmit = async (data: RegisterFormData) => {
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
        cfToken: token,
      };

      const response = await apiClient.post('/auth/register', payload);
      
      setRegisteredEmail(data.email);
      setStep('otp');
      toast.success('Verification code sent to your email!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to register');
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpValue.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      const guestSessionId = getGuestSessionId();
      const payload = {
        email: registeredEmail,
        otp: otpValue,
        guestSessionId: guestSessionId || undefined,
      };

      const response = await apiClient.post('/auth/verify-email', payload);
      
      setAuth(response.data.user);
      
      toast.success('Account created successfully!');
      
      // Prevent Open Redirect attacks by ensuring the callbackUrl is a relative path
      const safeCallbackUrl = (callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')) 
        ? callbackUrl 
        : '/profile?onboarding=true';
        
      window.location.href = safeCallbackUrl;
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="space-y-8"
      >
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              We've sent a 6-digit code to <strong>{registeredEmail}</strong>
            </p>
          </div>

          <form onSubmit={onVerifyOtp} className="space-y-6">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otpValue}
                onChange={setOtpValue}
                disabled={isLoading}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button type="submit" className="w-full" disabled={!isMounted ? false : (isLoading || otpValue.length !== 6)}>
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </Button>
          </form>
          <div className="text-center text-sm text-muted-foreground pt-4">
            <button
              onClick={() => setStep('form')}
              className="text-primary hover:underline"
            >
              Go back
            </button>
          </div>
      </motion.div>
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
          <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
          <p className="text-sm text-muted-foreground">
            Enter your details below to create your account
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <FloatingInput id="firstName" label="First name" {...register('firstName')} />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <FloatingInput id="lastName" label="Last name" {...register('lastName')} />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

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
            {/* Password Strength Meter */}
            <div className="space-y-1 mt-2">
              <div className="flex gap-1 h-1.5 w-full">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`h-full flex-1 rounded-full transition-colors ${
                      level <= satisfiedCount ? strengthColor : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              {password.length > 0 && missingReqs.length > 0 && (
                <p className="text-[0.8rem] text-muted-foreground">
                  Missing: {missingReqs.join(', ')}
                </p>
              )}
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
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
                    options={{ action: 'register' }}
                    scriptOptions={{ appendTo: 'body' }}
                  />
                </div>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={!isMounted ? false : (isLoading || !token)}>
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </div>
    </motion.div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex h-[400px] items-center justify-center"><div className="animate-pulse">Loading...</div></div>}>
      <RegisterContent />
    </Suspense>
  );
}
