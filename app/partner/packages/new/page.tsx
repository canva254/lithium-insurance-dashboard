'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, PlusCircle, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useCreatePartnerPackage } from '@/hooks/usePartnerPackages';

const CATEGORY_OPTIONS = ['motor', 'health', 'travel', 'property', 'life', 'home', 'business'] as const;
const TOTAL_STEPS = 3;

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  category: z.enum(CATEGORY_OPTIONS),
  basePrice: z.coerce.number().min(0, 'Price must be a positive number'),
  features: z.array(z.string().min(1, 'Feature cannot be empty')).default([]),
  tags: z.string().optional(),
  changeSummary: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const parseTags = (value?: string | null) =>
  value
    ?.split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean) ?? [];

const StepIndicator = ({ currentStep }: { currentStep: number }) => (
  <div className='flex items-center justify-between'>
    {[1, 2, 3].map((step) => {
      const circleClass = [
        'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold',
        currentStep >= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
      ].join(' ');

      return (
        <div key={step} className='flex flex-col items-center'>
          <div className={circleClass}>{step}</div>
          <span className='mt-1 text-xs text-muted-foreground'>
            {step === 1 ? 'Details' : step === 2 ? 'Pricing' : 'Review'}
          </span>
        </div>
      );
    })}
    <div className='-mt-4 flex-1 h-0.5 bg-muted' />
  </div>
);

export default function NewPackagePage() {
  const router = useRouter();
  const { toast } = useToast();
  const createPackage = useCreatePartnerPackage();

  const [currentStep, setCurrentStep] = useState(1);
  const [featureInput, setFeatureInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      category: 'motor',
      basePrice: 0,
      features: [],
      tags: '',
      changeSummary: '',
    },
  });

  const watchedFeatures = form.watch('features');
  const watchedValues = form.watch();

  const stepFields: Record<number, (keyof FormValues)[]> = useMemo(
    () => ({
      1: ['name', 'category'],
      2: ['basePrice', 'features'],
      3: [],
    }),
    [],
  );

  const validateAndAdvance = useCallback(async () => {
    const fields = stepFields[currentStep];
    if (fields.length === 0) {
      setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
      return;
    }

    const valid = await form.trigger(fields, { shouldFocus: true });
    if (valid) {
      setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
    }
  }, [currentStep, form, stepFields]);

  const handleAddFeature = useCallback(() => {
    const value = featureInput.trim();
    if (!value) {
      return;
    }

    const existing = form.getValues('features');
    if (existing.includes(value)) {
      setFeatureInput('');
      return;
    }

    const next = [...existing, value];
    form.setValue('features', next, { shouldDirty: true, shouldValidate: true });
    form.clearErrors('features');
    void form.trigger('features');
    setFeatureInput('');
  }, [featureInput, form]);

  const handleRemoveFeature = useCallback(
    (feature: string) => {
      const next = form.getValues('features').filter((item) => item !== feature);
      form.setValue('features', next, { shouldDirty: true, shouldValidate: true });
      void form.trigger('features');
    },
    [form],
  );

  const handleSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      const payload = {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        category: values.category,
        basePrice: values.basePrice,
        features: values.features,
        tags: parseTags(values.tags),
        changeSummary: values.changeSummary?.trim() || undefined,
      };

      const response = await createPackage.mutateAsync(payload);
      const targetId = response.data?.id;

      toast({
        title: 'Package created',
        description: 'Your draft has been saved. Submit it for review when ready.',
      });

      router.push(targetId ? `/partner/packages/${targetId}` : '/partner/packages');
    } catch (error: any) {
      toast({
        title: 'Creation failed',
        description: error?.message || 'Failed to create package draft. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button variant='outline' size='sm' onClick={() => router.back()}>
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Create new package</h1>
          <p className='text-sm text-muted-foreground'>
            {currentStep === 1 && 'Basic package information'}
            {currentStep === 2 && 'Pricing, features, and metadata'}
            {currentStep === 3 && 'Review details before submitting'}
          </p>
        </div>
      </div>

      <div className='mb-6'>
        <StepIndicator currentStep={currentStep} />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-6'>
          {currentStep === 1 && (
            <div className='space-y-4'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package name</FormLabel>
                    <FormControl>
                      <Input placeholder='e.g., Comprehensive Motor Insurance' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Describe the package in detail...'
                        className='min-h-[100px]'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='category'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select a category' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option.charAt(0).toUpperCase() + option.slice(1)} Insurance
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {currentStep === 2 && (
            <div className='space-y-6'>
              <FormField
                control={form.control}
                name='basePrice'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base price (KES)</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min='0'
                        step='0.01'
                        value={field.value}
                        onChange={(event) => {
                          const parsed = Number(event.target.value);
                          field.onChange(Number.isNaN(parsed) ? 0 : parsed);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='space-y-2'>
                <label className='text-sm font-medium'>Features</label>
                <div className='flex gap-2'>
                  <Input
                    value={featureInput}
                    onChange={(event) => setFeatureInput(event.target.value)}
                    placeholder='Add a feature'
                  />
                  <Button type='button' variant='outline' onClick={handleAddFeature}>
                    <PlusCircle className='mr-2 h-4 w-4' /> Add
                  </Button>
                </div>
                {form.formState.errors.features?.message && (
                  <p className='text-xs text-destructive'>{form.formState.errors.features.message}</p>
                )}
                {watchedFeatures.length > 0 && (
                  <div className='flex flex-wrap gap-2'>
                    {watchedFeatures.map((feature) => (
                      <span
                        key={feature}
                        className='inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs'
                      >
                        {feature}
                        <button
                          type='button'
                          className='text-muted-foreground hover:text-foreground'
                          onClick={() => handleRemoveFeature(feature)}
                        >
                          <X className='h-3 w-3' />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className='grid gap-4 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='tags'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='Comma or newline separated tags'
                          className='min-h-[80px]'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='changeSummary'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='Share internal context or change summary'
                          className='min-h-[80px]'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className='space-y-4 rounded-lg border border-dashed border-border p-4'>
              <div>
                <h3 className='text-sm font-medium text-muted-foreground'>Package name</h3>
                <p className='text-sm text-foreground'>{watchedValues.name || '--'}</p>
              </div>
              <div>
                <h3 className='text-sm font-medium text-muted-foreground'>Description</h3>
                <p className='whitespace-pre-line text-sm text-foreground'>
                  {watchedValues.description?.trim() || 'No description provided.'}
                </p>
              </div>
              <div className='grid gap-2 sm:grid-cols-2'>
                <div>
                  <h3 className='text-sm font-medium text-muted-foreground'>Category</h3>
                  <p className='text-sm capitalize text-foreground'>{watchedValues.category}</p>
                </div>
                <div>
                  <h3 className='text-sm font-medium text-muted-foreground'>Base price</h3>
                  <p className='text-sm text-foreground'>
                    KES {Number(watchedValues.basePrice || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div>
                <h3 className='text-sm font-medium text-muted-foreground'>Features</h3>
                {watchedFeatures.length > 0 ? (
                  <ul className='list-disc pl-5 text-sm text-foreground'>
                    {watchedFeatures.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                ) : (
                  <p className='text-sm text-muted-foreground'>No features added.</p>
                )}
              </div>
              <div>
                <h3 className='text-sm font-medium text-muted-foreground'>Tags</h3>
                {parseTags(watchedValues.tags).length > 0 ? (
                  <div className='flex flex-wrap gap-2 text-sm'>
                    {parseTags(watchedValues.tags).map((tag) => (
                      <span key={tag} className='rounded-full border px-3 py-1 text-xs'>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className='text-sm text-muted-foreground'>No tags provided.</p>
                )}
              </div>
              <div>
                <h3 className='text-sm font-medium text-muted-foreground'>Internal notes</h3>
                <p className='whitespace-pre-line text-sm text-foreground'>
                  {watchedValues.changeSummary?.trim() || 'No notes added.'}
                </p>
              </div>
            </div>
          )}

          <div className='flex justify-between pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 1))}
              disabled={currentStep === 1}
            >
              Previous
            </Button>
            {currentStep < TOTAL_STEPS ? (
              <Button type='button' onClick={validateAndAdvance}>
                Next
              </Button>
            ) : (
              <Button type='submit' disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create package'}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
