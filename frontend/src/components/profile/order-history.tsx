'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  priceAtPurchase: number;
  productNameAtPurchase: string;
  images?: string[];
}

interface Order {
  id: string;
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  shippingAddress: any;
  items: OrderItem[];
}

export function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // Backend hasn't completely populated items yet, but we have the endpoint
        const response = await apiClient.get('/profile/orders');
        setOrders(response.data);
      } catch (error) {
        console.error('Failed to fetch orders', error);
        toast.error('Failed to load order history');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary">Pending</Badge>;
      case 'processing': return <Badge variant="default" className="bg-blue-500">Processing</Badge>;
      case 'shipped': return <Badge variant="default" className="bg-amber-500">Shipped</Badge>;
      case 'delivered': return <Badge variant="default" className="bg-green-600">Delivered</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="rounded-md border p-4 space-y-4">
            <div className="flex justify-between border-b pb-4">
              <Skeleton className="h-4 w-1/5" />
              <Skeleton className="h-4 w-1/5" />
              <Skeleton className="h-4 w-1/5" />
              <Skeleton className="h-4 w-1/5" />
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center py-4 border-b last:border-0 border-muted">
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-4 w-1/6" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
          <CardDescription>You haven't placed any orders yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order History</CardTitle>
        <CardDescription>View your recent orders and their status.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <React.Fragment key={order.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleExpand(order.id)}
                  >
                    <TableCell className="font-medium text-xs">{order.id.split('-')[0]}...</TableCell>
                    <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      {expandedOrderId === order.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                  </TableRow>
                  <AnimatePresence initial={false}>
                    {expandedOrderId === order.id && (
                      <TableRow className="bg-muted/30 border-0">
                        <TableCell colSpan={5} className="p-0 border-b-0">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 pl-8 border-l-4 border-l-primary">
                              <h4 className="font-semibold text-sm mb-3">Order Items</h4>
                              <div className="space-y-3">
                                {order.items.length > 0 ? order.items.map((item) => (
                                  <div key={item.id} className="flex justify-between items-center text-sm">
                                    <div className="flex gap-4 items-center">
                                      <div className="relative w-12 h-12 bg-neutral-50 border rounded-md flex items-center justify-center overflow-hidden">
                                        {item.images && item.images.length > 0 ? (
                                          <Image
                                            src={item.images[0]}
                                            alt={item.productNameAtPurchase || 'Product image'}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 640px) 48px, 48px"
                                          />
                                        ) : (
                                          <span className="text-[10px] text-muted-foreground">No Image</span>
                                        )}
                                      </div>
                                      <div>
                                        <p className="font-medium">{item.productNameAtPurchase}</p>
                                        <p className="text-muted-foreground text-xs">Qty: {item.quantity} × {formatCurrency(item.priceAtPurchase)}</p>
                                      </div>
                                    </div>
                                    <div className="font-semibold">
                                      {formatCurrency(item.priceAtPurchase * item.quantity)}
                                    </div>
                                  </div>
                                )) : (
                                  <p className="text-sm text-muted-foreground">No items found for this order.</p>
                                )}
                              </div>
                              <div className="mt-4 pt-4 border-t text-sm">
                                <span className="font-medium">Shipping Address: </span>
                                <span className="text-muted-foreground">
                                  {order.shippingAddress?.addressLine1}, {order.shippingAddress?.city}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        </TableCell>
                      </TableRow>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
