import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        live:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
        updated:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/90",
        removed:
          "border-transparent bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        new:
          "text-foreground hover:bg-accent hover:text-accent-foreground",
        reposted:
          "border-transparent bg-emerald-600 text-white hover:bg-emerald-700",
        needs_review:
          "border-transparent bg-amber-500 text-white hover:bg-amber-600",
        failed:
          "border-transparent bg-destructive text-white hover:bg-destructive/90",
      },
    },
    defaultVariants: {
      variant: "live",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export { Badge, badgeVariants };
