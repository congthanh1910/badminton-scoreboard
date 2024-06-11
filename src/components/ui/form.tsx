import { createContext, forwardRef, useId } from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { Slot } from '@radix-ui/react-slot';
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
} from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { cn } from '@/utils/cn';
import { makeUseContext } from '@/utils/context';
import { Nullable } from '@/utils/types';

export const Form = FormProvider;

interface FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  name: TName;
  id: string;
}

const FormFieldContext = createContext<Nullable<FormFieldContextValue>>(null);

const useFormFieldContext = makeUseContext(FormFieldContext, 'FormFieldContext');

export const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>(
  props: ControllerProps<TFieldValues, TName>
) => {
  const id = useId();

  return (
    <FormFieldContext.Provider value={{ name: props.name, id }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

function useFormField() {
  const field = useFormFieldContext();

  const { getFieldState, formState } = useFormContext();

  return {
    ...field,
    fieldId: `${field.id}-field`,
    fieldDescriptionId: `${field.id}-field-description`,
    fieldMessageId: `${field.id}-field-message`,
    ...getFieldState(field.name, formState),
  };
}

export const FormLabel = forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(function FormLabel({ className, ...props }, ref) {
  const { error, fieldId } = useFormField();

  return (
    <Label
      ref={ref}
      className={cn(error && 'text-destructive', className)}
      htmlFor={fieldId}
      {...props}
    />
  );
});

export const FormControl = forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(function FormControl({ ...props }, ref) {
  const { error, fieldId, fieldDescriptionId, fieldMessageId } = useFormField();

  return (
    <Slot
      ref={ref}
      id={fieldId}
      aria-describedby={
        !error ? `${fieldDescriptionId}` : `${fieldDescriptionId} ${fieldMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  );
});

export const FormDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(function FormDescription({ className, ...props }, ref) {
  const { fieldDescriptionId } = useFormField();

  return (
    <p
      ref={ref}
      id={fieldDescriptionId}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
});

export const FormMessage = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(function FormMessage({ className, children, ...props }, ref) {
  const { error, fieldMessageId } = useFormField();
  const body = error ? error.message?.toString() : children;
  if (!body) return null;
  return (
    <p
      ref={ref}
      id={fieldMessageId}
      className={cn('text-sm font-medium text-destructive', className)}
      {...props}
    >
      {body}
    </p>
  );
});
