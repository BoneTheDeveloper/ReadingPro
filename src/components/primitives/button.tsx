import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/components/utils";

// Buttons follow design.md §5:
// - Standard: radius 14px, padding 11px 20px, 14px/600, transition all 140ms ease
// - Tinted shadow per variant (indigo / coral), hover lift -1px, press sink +1px
// - Secondary: white bg + border → indigo border/text on hover
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[14px] border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Primary: indigo bg, white text, tinted indigo shadow, hover lift
        default:
          "bg-primary text-primary-foreground shadow-indigo hover:-translate-y-px hover:bg-indigo-hover",
        // Secondary: white bg, ink text, border → indigo on hover, card-subtle shadow
        secondary:
          "bg-surface text-ink border-border shadow-card hover:border-primary hover:text-primary hover:-translate-y-px",
        // Outline: transparent, border visible, hover background
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        // Ghost: transparent, hover muted surface
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        // Destructive: coral bg, white text, tinted coral shadow
        destructive:
          "bg-coral text-white shadow-coral hover:-translate-y-px hover:bg-coral-hover focus-visible:ring-coral/20",
        // Coral accent (used sparingly — one prominent CTA per screen per §1)
        coral:
          "bg-coral text-white shadow-coral hover:-translate-y-px hover:bg-coral-hover",
        link: "text-primary underline-offset-4 hover:underline rounded-md",
      },
      size: {
        // 11px 20px padding per §5
        default:
          "h-10 gap-1.5 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        // Small: 8px 14px padding, radius 11px, 12px/600
        sm: "h-8 gap-1 rounded-[11px] px-3.5 text-xs has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-3.5",
        xs: "h-7 gap-1 rounded-[10px] px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        // Large button
        lg: "h-12 gap-2 px-6 text-base has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        // 38-40px square icon button per §5
        icon: "size-10 rounded-[12px]",
        "icon-xs": "size-7 rounded-[10px] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-[11px]",
        "icon-lg": "size-12 rounded-[14px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
