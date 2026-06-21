"use client";

import { cn } from "../../lib/utils.js";
import type { ComponentProps, ElementType } from "react";
import { memo } from "react";

export type ShimmerProps<T extends ElementType = "span"> = {
  as?: T;
  children: string;
  className?: string;
  duration?: number;
} & Omit<ComponentProps<T>, "as" | "children" | "className">;

function ShimmerComponent<T extends ElementType = "span">({
  as,
  children,
  className,
  duration = 2,
  ...props
}: ShimmerProps<T>) {
  const Component = (as ?? "span") as ElementType;

  return (
    <Component
      data-slot="shimmer"
      className={cn(
        "inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
        "animate-[shimmer_2s_linear_infinite] motion-reduce:animate-none",
        "bg-[linear-gradient(110deg,transparent_35%,var(--foreground)_55%,transparent_75%),linear-gradient(var(--muted-foreground),var(--muted-foreground))]",
        className,
      )}
      style={{ animationDuration: `${duration}s` }}
      {...props}
    >
      {children}
    </Component>
  );
}

export const Shimmer = memo(ShimmerComponent) as typeof ShimmerComponent;
