'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/lib/api';
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const paymentIntentId = searchParams.get('payment_intent');
  const router = useRouter();
  const { clearCart } = useCartStore();
  const { isAuthenticated, login } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  
  // Post-purchase account creation state
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    // If no payment intent is present, someone probably just navigated here directly.
    if (!paymentIntentId) {
      router.push('/');
      return;
    }

    // Ideally, we'd verify the payment intent status with the backend.
    // For now, we assume success because Stripe redirected us here.
    clearCart().finally(() => {
      setLoading(false);
    });

  }, [paymentIntentId, router, clearCart]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Email and password are required');
    
    setIsRegistering(true);
    try {
      await apiClient.post('/auth/register', { email, password });
      toast.success('Verification code sent to your email!');
      setStep(2);
    } catch (error: any) {
      if (error.response?.status === 409) {
        setMode('login');
        toast.info('An account with this email exists. Please log in to link your order.');
      } else {
        toast.error('Registration failed', {
          description: error.response?.data?.error || 'Please try again.'
        });
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Email and password are required');
    
    setIsRegistering(true);
    try {
      const res = await apiClient.post('/auth/login', { 
        email, 
        password,
        paymentIntentId 
      });
      useAuthStore.setState({ isAuthenticated: true, user: res.data.user });
      toast.success('Successfully logged in and linked order!');
      setTimeout(() => router.push('/profile'), 1500);
    } catch (error: any) {
      toast.error('Login failed', {
        description: error.response?.data?.error || 'Invalid credentials'
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Please enter the 6-digit code');
    
    setIsRegistering(true);
    try {
      const res = await apiClient.post('/auth/verify-email', { email, otp, paymentIntentId });
      // Authenticate in zustand
      useAuthStore.setState({ isAuthenticated: true, user: res.data.user });
      toast.success('Account created successfully!');
      
      // Guest orders are now linked! 
      setTimeout(() => router.push('/profile'), 1500);
    } catch (error: any) {
      toast.error('Verification failed', {
        description: error.response?.data?.error || 'Invalid code'
      });
    } finally {
      setIsRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-xl font-medium text-neutral-500">Confirming your order...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl min-h-[70vh]">
      <div className="flex flex-col items-center text-center space-y-6 mb-16">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
          <CheckCircle className="w-12 h-12" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-neutral-900">Payment Successful!</h1>
        <p className="text-xl text-neutral-500 max-w-lg">
          Thank you for your order. We've sent a confirmation email with your order details and tracking information.
        </p>
        
        {isAuthenticated && (
          <Button onClick={() => router.push('/profile')} variant="outline" className="mt-8">
            View Order History
          </Button>
        )}
      </div>

      {!isAuthenticated && (
        <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-xl border border-neutral-100">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Track Your Order</h2>
            <p className="text-neutral-500 text-sm">
              {mode === 'register' 
                ? "Create an account to easily track this order and speed up future checkouts."
                : "Log in to your existing account to securely link this order to your history."}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={mode === 'register' ? handleRegister : handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="The email used for your order"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={mode === 'login'} // Prevent changing email if they are specifically logging in to link this order
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{mode === 'register' ? 'Create Password' : 'Password'}</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
              <Button type="submit" className="w-full" disabled={isRegistering}>
                {isRegistering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {mode === 'register' ? 'Create Account' : 'Log In & Link Order'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-6 flex flex-col items-center">
              <div className="text-center mb-2 space-y-2">
                <Label>Enter Verification Code</Label>
                <p className="text-xs text-neutral-500">We sent a 6-digit code to {email}</p>
              </div>
              
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>

              <Button type="submit" className="w-full mt-4" disabled={isRegistering || otp.length !== 6}>
                {isRegistering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Verify & Link Orders
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
