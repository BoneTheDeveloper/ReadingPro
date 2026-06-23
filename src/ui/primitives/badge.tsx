import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/contracts/utils";

// Badges & chips per design.md §6:
// - Pill (radius 99px), 4px 12px padding, 12px/700
// - CEFR: A=green, B=amber, C=coral, each with a light/dark step
// - Learning status: leading dot (new=amber, learning=indigo, known=green)
// - Chip: white bg, border, indigo when active
const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-transparent px-3 text-xs font-bold whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        // Generic
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",

        // CEFR levels — semantic difficulty scale A→B→C (green→amber→coral)
        cefrA1: "bg-cefr-a1 text-cefr-a1-text",
        cefrA2: "bg-cefr-a2 text-cefr-a2-text",
        cefrB1: "bg-cefr-b1 text-cefr-b1-text",
        cefrB2: "bg-cefr-b2 text-cefr-b2-text",
        cefrC1: "bg-cefr-c1 text-cefr-c1-text",
        cefrC2: "bg-cefr-c2 text-cefr-c2-text",

        // Learning status — bg + text; leading dot rendered via before: pseudo
        statusNew: "bg-status-new-bg text-status-new-text",
        statusLearning: "bg-status-learning-bg text-status-learning-text",
        statusKnown: "bg-status-known-bg text-status-known-text",

        // Chip — pill, border, white bg, indigo when active
        chip:
          "bg-surface text-ink-2 border-border hover:border-primary hover:text-primary",
        chipActive: "bg-primary text-primary-foreground border-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

// Helper maps for typed lookups in feature code
export const CEFR_BADGE_VARIANT = {
  A1: "cefrA1",
  A2: "cefrA2",
  B1: "cefrB1",
  B2: "cefrB2",
  C1: "cefrC1",
  C2: "cefrC2",
} as const satisfies Record<string, BadgeVariant>;

export const STATUS_BADGE_VARIANT = {
  new: "statusNew",
  learning: "statusLearning",
  known: "statusKnown",
} as const satisfies Record<string, BadgeVariant>;
