// Adapted from shadcn/ui (MIT) "button" (new-york-v4) to MASTER §8: 44 px touch targets, dark text on primary,
// --input borders for secondary/outline, colour/opacity-only press feedback.
import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-[background-color,opacity,color] duration-150 select-none disabled:pointer-events-none disabled:opacity-45 active:opacity-85 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "border border-input bg-transparent text-foreground hover:bg-accent",
        ghost: "text-foreground hover:bg-accent",
        destructive: "border border-destructive bg-transparent text-destructive hover:bg-accent",
        link: "text-primary-text underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-11 px-5",
        sm: "min-h-11 px-3",
        icon: "size-11 rounded-full",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button data-slot="button" type={type} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { buttonVariants };
