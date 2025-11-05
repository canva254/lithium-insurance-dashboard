'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { quotesAPI, paymentsAPI } from '@/lib/api';

export default function QuoteDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [isPolling, setIsPolling] = useState(false);
  
  const { data: quoteData, isLoading } = useQuery({
    queryKey: ['quote', params.id],
    queryFn: () => quotesAPI.getById(params.id),
  });
  
  const quote = quoteData?.data;
  
  const initiateMpesaMutation = useMutation({
    mutationFn: paymentsAPI.initiateMpesa,
    onSuccess: async (data) => {
      const paymentId = data.data.paymentId;
      setIsPolling(true);
      
      // Poll payment status
      const maxAttempts = 40; // 2 minutes
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 seconds
        
        try {
          const statusData = await paymentsAPI.getStatus({ payment_id: paymentId });
          const status = statusData.data.status;
          
          if (status === 'succeeded') {
            alert('Payment successful! Quote converted to policy.');
            queryClient.invalidateQueries({ queryKey: ['quote', params.id] });
            setShowPaymentModal(false);
            setIsPolling(false);
            router.push('/policies');
            return;
          } else if (status === 'failed') {
            alert('Payment failed. Please try again.');
            setIsPolling(false);
            return;
          }
        } catch (error) {
          console.error('Error checking payment status:', error);
        }
      }
      
      alert('Payment timeout. Please check payment status manually.');
      setIsPolling(false);
    },
    onError: (error: any) => {
      alert(`Failed to initiate payment: ${error.message || 'Unknown error'}`);
    },
  });
  
  const convertMutation = useMutation({
    mutationFn: () => quotesAPI.convert(params.id, { skipPaymentCheck: true }),
    onSuccess: (data) => {
      alert('Quote converted to policy successfully!');
      router.push(`/policies`);
    },
    onError: (error: any) => {
      alert(`Failed to convert quote: ${error.message || 'Unknown error'}`);
    },
  });
  
  const handleInitiatePayment = () => {
    if (!phone.match(/^254\d{9}$/)) {
      alert('Please enter a valid phone number (254XXXXXXXXX)');
      return;
    }
    
    initiateMpesaMutation.mutate({
      quoteId: params.id,
      amount: quote!.totalAmount,
      phone,
    });
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  
  if (!quote) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Quote not found</h2>
        <p className="mt-2 text-gray-600">The quote you're looking for doesn't exist.</p>
        <button
          onClick={() => router.push('/quotes')}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary/90"
        >
          Back to Quotes
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/quotes')}
            className="mb-2 text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to Quotes
          </button>
          <h1 className="text-3xl font-bold">Quote {quote.id}</h1>
        </div>
        <div className="flex gap-2">
          {quote.status === 'approved' && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              Pay via M-Pesa
            </button>
          )}
          
          {quote.status !== 'converted' && (
            <button
              onClick={() => convertMutation.mutate()}
              className="rounded-lg border px-4 py-2 hover:bg-gray-50"
              disabled={convertMutation.isPending}
            >
              {convertMutation.isPending ? 'Converting...' : 'Convert to Policy'}
            </button>
          )}
        </div>
      </div>
      
      {/* Status Badge */}
      <div>
        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
          quote.status === 'converted' ? 'bg-purple-100 text-purple-800' :
          quote.status === 'approved' ? 'bg-green-100 text-green-800' :
          quote.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
        </span>
      </div>
      
      {/* Quote Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Contact Information</h2>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-600">Name:</dt>
              <dd className="font-medium">{quote.contactName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Email:</dt>
              <dd>{quote.contactEmail || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Phone:</dt>
              <dd>{quote.contactPhone || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Source:</dt>
              <dd className="capitalize">{quote.source}</dd>
            </div>
          </dl>
        </div>
        
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Coverage Details</h2>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-600">Product:</dt>
              <dd className="font-medium">{quote.productKey}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Cover Type:</dt>
              <dd>{quote.coverType}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Duration:</dt>
              <dd>{quote.durationMonths} months</dd>
            </div>
            {quote.makeModel && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Vehicle:</dt>
                <dd>{quote.makeModel} ({quote.year})</dd>
              </div>
            )}
            {quote.vehicleType && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Type:</dt>
                <dd>{quote.vehicleType}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
      
      {/* Pricing */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Pricing</h2>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-gray-600">Premium:</dt>
            <dd className="font-medium">{quote.currency} {quote.premium.toLocaleString()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Fees:</dt>
            <dd>{quote.currency} {quote.fees.toLocaleString()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Taxes:</dt>
            <dd>{quote.currency} {quote.taxes.toLocaleString()}</dd>
          </div>
          <div className="flex justify-between border-t pt-3 text-lg">
            <dt className="font-semibold">Total:</dt>
            <dd className="font-bold">{quote.currency} {quote.totalAmount.toLocaleString()}</dd>
          </div>
        </dl>
      </div>
      
      {/* M-Pesa Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 text-xl font-semibold">M-Pesa Payment</h3>
            <p className="mb-4 text-gray-600">
              Amount: <span className="font-bold">{quote.currency} {quote.totalAmount.toLocaleString()}</span>
            </p>
            
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">Phone Number</label>
              <input
                type="tel"
                placeholder="254712345678"
                className="w-full rounded-lg border px-4 py-2"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isPolling}
              />
              <p className="mt-1 text-xs text-gray-500">Format: 254XXXXXXXXX</p>
            </div>
            
            {isPolling && (
              <div className="mb-4 rounded-lg bg-blue-50 p-4 text-center">
                <p className="text-sm text-blue-800">
                  Waiting for payment confirmation on phone...
                </p>
                <div className="mt-2">
                  <div className="h-2 w-full rounded-full bg-blue-200">
                    <div className="h-2 animate-pulse rounded-full bg-blue-600" style={{ width: '60%' }} />
                  </div>
                </div>
                <p className="mt-2 text-xs text-blue-600">
                  Please complete the payment on your phone. This may take up to 2 minutes.
                </p>
              </div>
            )}
            
            <div className="flex gap-2">
              <button
                onClick={handleInitiatePayment}
                disabled={isPolling || initiateMpesaMutation.isPending}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isPolling ? 'Waiting...' : initiateMpesaMutation.isPending ? 'Initiating...' : 'Send STK Push'}
              </button>
              <button
                onClick={() => setShowPaymentModal(false)}
                disabled={isPolling}
                className="rounded-lg border px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
