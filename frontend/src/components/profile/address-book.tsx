'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Edit, MapPin, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';

export type Address = {
  id: string;
  label: string;
  firstName: string;
  lastName: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  mobile: string;
  isDefault: boolean;
};

interface AddressBookProps {
  addresses: Address[];
  onChange: (addresses: Address[]) => void;
}

const addressSchema = z.object({
  label: z.string().min(1, 'Label is required (e.g., Home, Work)'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  mobile: z.string().min(10, 'Mobile is required'),
  addressLine1: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().min(5, 'Postal code is required'),
});

type AddressFormValues = z.infer<typeof addressSchema>;

export function AddressBook({ addresses, onChange }: AddressBookProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
  });

  const handleOpenDialog = (address?: Address) => {
    if (address) {
      setEditingId(address.id);
      reset(address);
    } else {
      setEditingId(null);
      reset({ label: '', firstName: '', lastName: '', addressLine1: '', city: '', state: '', postalCode: '', mobile: '' });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = (data: AddressFormValues) => {
    let newAddresses = [...addresses];
    
    if (editingId) {
      newAddresses = newAddresses.map(addr => addr.id === editingId ? { ...addr, ...data } : addr);
    } else {
      const isFirst = newAddresses.length === 0;
      newAddresses.push({
        id: uuidv4(),
        ...data,
        isDefault: isFirst,
      });
    }
    
    onChange(newAddresses);
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    const newAddresses = addresses.filter(addr => addr.id !== id);
    // If we deleted the default, make the first remaining one default
    if (addresses.find(a => a.id === id)?.isDefault && newAddresses.length > 0) {
      newAddresses[0].isDefault = true;
    }
    onChange(newAddresses);
  };

  const handleSetDefault = (id: string) => {
    const newAddresses = addresses.map(addr => ({
      ...addr,
      isDefault: addr.id === id,
    }));
    onChange(newAddresses);
  };

  return (
    <div className="space-y-4">
      {addresses.length === 0 ? (
        <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed">
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No addresses saved yet.</p>
          <Button variant="outline" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" /> Add New Address
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map(addr => (
            <Card key={addr.id} className={`relative ${addr.isDefault ? 'border-primary' : ''}`}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{addr.label}</h4>
                    {addr.isDefault && <Badge variant="default" className="text-[10px] px-1.5 py-0">Default</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenDialog(addr)}>
                      <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(addr.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>{addr.firstName} {addr.lastName}</p>
                  <p>{addr.addressLine1}</p>
                  <p>{addr.city}, {addr.state} {addr.postalCode}</p>
                  <p>Mobile: {addr.mobile}</p>
                </div>
                
                {!addr.isDefault && (
                  <Button variant="link" className="px-0 h-auto mt-3 text-xs" onClick={() => handleSetDefault(addr.id)}>
                    Set as default
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          
          <Button variant="outline" className="h-full min-h-[160px] border-dashed" onClick={() => handleOpenDialog()}>
            <div className="flex flex-col items-center">
              <Plus className="h-6 w-6 mb-2" />
              <span>Add New Address</span>
            </div>
          </Button>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Address' : 'Add New Address'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Address Label (e.g., Home, Work)</Label>
              <Input id="label" {...register('label')} />
              {errors.label && <p className="text-xs text-red-500">{errors.label.message}</p>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" {...register('firstName')} />
                {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" {...register('lastName')} />
                {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input id="mobile" {...register('mobile')} />
              {errors.mobile && <p className="text-xs text-red-500">{errors.mobile.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressLine1">Street Address</Label>
              <Input id="addressLine1" {...register('addressLine1')} />
              {errors.addressLine1 && <p className="text-xs text-red-500">{errors.addressLine1.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register('city')} />
                {errors.city && <p className="text-xs text-red-500">{errors.city.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" {...register('state')} />
                {errors.state && <p className="text-xs text-red-500">{errors.state.message}</p>}
              </div>
            </div>

            <div className="space-y-2 w-1/2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input id="postalCode" {...register('postalCode')} />
              {errors.postalCode && <p className="text-xs text-red-500">{errors.postalCode.message}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save Address</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
