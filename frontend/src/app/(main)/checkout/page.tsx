'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FloatingInput } from '@/components/ui/floating-input';
import { Label } from '@/components/ui/label';
import { Loader2, Minus, Plus, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx');

const shippingSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  mobile: z.string().min(10, 'Mobile is required'),
  addressLine1: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().min(5, 'Postal code is required'),
  saveInfo: z.boolean().optional(),
});

type ShippingFormValues = z.infer<typeof shippingSchema>;

export default function CheckoutPage() {
  const { items, getGuestSessionId, fetchCart, updateQuantity, removeFromCart } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const subtotal = useMemo(() => items.reduce((acc, item) => acc + item.price * item.quantity, 0), [items]);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      mobile: '',
      saveInfo: false
    }
  });

  useEffect(() => {
    if (isAuthenticated) {
      apiClient.get('/profile').then(res => {
        const p = res.data;
        reset({
          email: p.email || '',
          firstName: p.firstName || '',
          lastName: p.lastName || '',
          mobile: p.phone || '',
          saveInfo: false
        });
      }).catch(console.error);
    }
  }, [isAuthenticated, reset]);

  const onSubmitShipping = async (data: ShippingFormValues) => {
    setIsInitializing(true);
    try {
      const sessionId = getGuestSessionId();
      const res = await apiClient.post('/checkout', {
        shippingAddress: data,
        guestSessionId: sessionId
      });
      setClientSecret(res.data.clientSecret);
      setOrderId(res.data.orderId);
      setSubmittedEmail(data.email);
    } catch (error: any) {
      toast.error('Failed to initialize checkout', {
        description: error.response?.data?.error || 'Please try again'
      });
    } finally {
      setIsInitializing(false);
    }
  };

  if (items.length === 0 && !clientSecret) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Checkout</h1>
        <p className="text-neutral-500 mb-8">Your cart is empty.</p>
        <Button onClick={() => router.push('/')}>Continue Shopping</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <h1 className="text-3xl font-bold mb-10">Secure Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        {/* Left Column: Order Summary */}
        <div className="lg:col-span-7 lg:order-1 order-2">
          <div className="bg-neutral-50 p-8 rounded-2xl shadow-sm border sticky top-24">
            <h2 className="text-xl font-semibold mb-6">Order Summary</h2>
            <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {items.map(item => (
                <div key={item.product_id} className="flex gap-4 text-sm py-3 border-b last:border-0 border-neutral-100">
                  {/* Left: Image Placeholder */}
                  <div className="relative w-16 h-16 sm:w-12 sm:h-12 bg-white rounded-md border flex items-center justify-center shrink-0 overflow-visible">
                    <div className="w-full h-full rounded-md overflow-hidden flex items-center justify-center bg-neutral-50 relative">
                      {item.images && item.images.length > 0 ? (
                        <Image 
                          src={item.images[0]} 
                          alt={item.name} 
                          fill 
                          className="object-cover"
                          sizes="(max-width: 640px) 64px, 48px"
                        />
                      ) : (
                        <span className="text-neutral-400 text-[10px]">No Image</span>
                      )}
                    </div>
                    {clientSecret && (
                      <span className="absolute -top-2 -right-2 w-5 h-5 bg-neutral-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold z-10">
                        {item.quantity}
                      </span>
                    )}
                  </div>
                  
                  {/* Right: Content */}
                  <div className="flex flex-1 flex-col justify-between gap-2">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-medium line-clamp-2 text-neutral-800">{item.name}</span>
                      <span className="font-semibold text-neutral-900 whitespace-nowrap shrink-0">{formatCurrency(item.price * item.quantity)}</span>
                    </div>

                    {!clientSecret && (
                      <div className="flex items-center justify-end gap-3 mt-auto">
                        <div className="flex items-center border rounded-md h-7 bg-white">
                          <button 
                            className="px-2 hover:bg-neutral-100 disabled:opacity-50 transition-colors"
                            onClick={() => item.quantity > 1 ? updateQuantity(item.product_id, item.quantity - 1) : removeFromCart(item.product_id)}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-medium w-6 text-center select-none">{item.quantity}</span>
                          <button 
                            className="px-2 hover:bg-neutral-100 disabled:opacity-50 transition-colors"
                            disabled={item.quantity >= item.stock_quantity}
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button 
                          className="text-neutral-400 hover:text-red-500 p-1 transition-colors"
                          onClick={() => removeFromCart(item.product_id)}
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-200 pt-4 space-y-3">
              <div className="flex justify-between text-neutral-500">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-black pt-4 border-t border-neutral-200">
                <span>Total</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Forms */}
        <div className="lg:col-span-5 lg:order-2 order-1">
          {!clientSecret ? (
            <div className="bg-white p-8 rounded-2xl shadow-sm border">
              <h2 className="text-xl font-semibold mb-6">Shipping Details</h2>
              <form onSubmit={handleSubmit(onSubmitShipping)} className="space-y-4">
                
                <div className="space-y-1">
                  <FloatingInput id="email" label="Email Address *" type="email" {...register('email')} readOnly={isAuthenticated} className={isAuthenticated ? "bg-neutral-100 text-neutral-500" : ""} />
                  {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <FloatingInput id="firstName" label="First Name" {...register('firstName')} />
                    {errors.firstName && <p className="text-sm text-red-500">{errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <FloatingInput id="lastName" label="Last Name" {...register('lastName')} />
                    {errors.lastName && <p className="text-sm text-red-500">{errors.lastName.message}</p>}
                  </div>
                </div>

                <div className="space-y-1">
                  <FloatingInput id="mobile" label="Mobile Number" {...register('mobile')} />
                  {errors.mobile && <p className="text-sm text-red-500">{errors.mobile.message}</p>}
                </div>

                <div className="space-y-1">
                  <FloatingInput id="addressLine1" label="Address Line 1" {...register('addressLine1')} />
                  {errors.addressLine1 && <p className="text-sm text-red-500">{errors.addressLine1.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <FloatingInput id="city" label="City" {...register('city')} />
                    {errors.city && <p className="text-sm text-red-500">{errors.city.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <FloatingInput id="state" label="State / Province" {...register('state')} />
                    {errors.state && <p className="text-sm text-red-500">{errors.state.message}</p>}
                  </div>
                </div>

                <div className="space-y-1">
                  <FloatingInput id="postalCode" label="Postal Code" {...register('postalCode')} />
                  {errors.postalCode && <p className="text-sm text-red-500">{errors.postalCode.message}</p>}
                </div>

                {isAuthenticated && (
                  <div className="flex items-center space-x-2 pt-2">
                    <input type="checkbox" id="saveInfo" {...register('saveInfo')} className="w-4 h-4 rounded border-neutral-300 text-black focus:ring-black" />
                    <Label htmlFor="saveInfo" className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Save this information to my profile for next time</Label>
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full mt-6" disabled={isInitializing}>
                  {isInitializing ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : null}
                  Continue to Payment
                </Button>
              </form>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl shadow-sm border">
              <h2 className="text-xl font-semibold mb-6">Payment</h2>
              <Elements stripe={stripePromise} options={{ 
                clientSecret, 
                appearance: { 
                  theme: 'stripe', 
                  variables: { colorPrimary: '#000000', borderRadius: '8px' } 
                } 
              }}>
                <CheckoutForm orderId={orderId} email={submittedEmail} />
              </Elements>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Separate component to use Stripe hooks
function CheckoutForm({ orderId, email }: { orderId: string | null, email: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    
    // In dev mode with test keys, if window origin isn't https, some redirect logic might break,
    // but typically `return_url` can just be our origin + path
    const return_url = `${window.location.origin}/checkout/success?email=${encodeURIComponent(email)}`;

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url,
      }
    });

    if (error) {
      toast.error('Payment failed', { description: error.message });
      setIsProcessing(false);
    } else {
      // successful payments will automatically redirect to the return_url
    }
  };

  return (
    <form onSubmit={handlePayment} className="space-y-6">
      <PaymentElement />
      <Button type="submit" size="lg" className="w-full" disabled={!stripe || isProcessing}>
        {isProcessing ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : null}
        Pay Now
      </Button>
    </form>
  );
}
