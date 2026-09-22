'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AvatarUpload } from './avatar-upload';
import { AddressBook } from './address-book';

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional().nullable(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').optional().nullable(),
  phone: z.string().optional().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function PersonalInfo() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState<any[]>([]);
  const { updateUser } = useAuthStore();

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/profile');
      const data = response.data;
      reset({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        phone: data.phone || '',
      });
      setAvatarUrl(data.avatarUrl);
      setEmail(data.email);
      setShippingAddress(data.shippingAddress || []);
      
      // Sync with global auth store so the Header updates
      updateUser({ 
        avatarUrl: data.avatarUrl,
        firstName: data.firstName,
        lastName: data.lastName
      });
    } catch (error) {
      console.error('Failed to fetch profile', error);
      toast.error('Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const onSubmit = async (data: ProfileFormValues) => {
    setIsSaving(true);
    try {
      await apiClient.put('/profile', { ...data, shippingAddress });
      toast.success('Profile updated successfully');
      reset(data); // Reset form state to current data so isDirty becomes false
    } catch (error) {
      console.error('Failed to update profile', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddressesChange = async (newAddresses: any[]) => {
    setShippingAddress(newAddresses);
    try {
      // Save just the addresses back to backend immediately for good UX
      const currentValues = await apiClient.get('/profile').then(res => res.data);
      await apiClient.put('/profile', { ...currentValues, shippingAddress: newAddresses });
      toast.success('Address book updated');
    } catch (error) {
      toast.error('Failed to update addresses');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="flex-1 h-32 w-full rounded-lg" />
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Skeleton className="h-4 w-20"/><Skeleton className="h-10 w-full"/></div>
                <div className="space-y-2"><Skeleton className="h-4 w-20"/><Skeleton className="h-10 w-full"/></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Skeleton className="h-4 w-20"/><Skeleton className="h-10 w-full"/></div>
                <div className="space-y-2"><Skeleton className="h-4 w-20"/><Skeleton className="h-10 w-full"/></div>
              </div>
              <Skeleton className="h-10 w-32 mt-4" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-[160px] w-full rounded-lg" />
              <Skeleton className="h-[160px] w-full rounded-lg" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your personal details and public profile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <AvatarUpload 
            currentAvatarUrl={avatarUrl} 
            onUploadSuccess={(url) => {
              setAvatarUrl(url);
              updateUser({ avatarUrl: url });
            }} 
          />
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" {...register('firstName')} />
                {errors.firstName && <p className="text-sm text-red-500">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" {...register('lastName')} />
                {errors.lastName && <p className="text-sm text-red-500">{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} disabled />
                <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" {...register('phone')} />
                {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
              </div>
            </div>

            <Button type="submit" disabled={isSaving || !isDirty}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address Book</CardTitle>
          <CardDescription>Manage your shipping addresses for a faster checkout.</CardDescription>
        </CardHeader>
        <CardContent>
          <AddressBook addresses={shippingAddress} onChange={handleAddressesChange} />
        </CardContent>
      </Card>
    </div>
  );
}
