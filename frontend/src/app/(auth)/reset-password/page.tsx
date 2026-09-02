'use client';

import { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResetPasswordSchema, ResetPasswordFormData } from '@/lib/validations';
import { apiClient } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(ResetPasswordSchema),
    mode: 'onChange',
  });

  const password = watch('newPassword') || '';
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

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token || !email) {
      toast.error('Invalid reset link. Please request a new one.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        email,
        token,
        newPassword: data.newPassword,
      };

      await apiClient.post('/auth/reset-password', payload);
      
      toast.success('Password has been reset successfully!');
      router.push('/login');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="w-full max-w-md space-y-8 rounded-xl border bg-card p-8 shadow-sm text-center">
        <h1 className="text-xl font-bold tracking-tight text-destructive">Invalid Reset Link</h1>
        <p className="text-sm text-muted-foreground">
          This password reset link is invalid or missing required parameters.
        </p>
        <div className="pt-4">
          <Link href="/forgot-password" className="font-medium text-primary hover:underline">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-8 rounded-xl border bg-card p-8 shadow-sm">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Set new password</h1>
        <p className="text-sm text-muted-foreground">
          Please enter your new password below.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              {...register('newPassword')}
            />
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
          </div>
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
          {errors.newPassword && (
            <p className="text-sm text-destructive">{errors.newPassword.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full mt-4" disabled={isLoading}>
          {isLoading ? 'Resetting...' : 'Reset Password'}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center p-4">
      <Suspense fallback={<div className="w-[400px] h-[400px] bg-muted animate-pulse rounded-xl" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
