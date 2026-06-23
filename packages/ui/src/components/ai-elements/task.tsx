"use client";

import { Collapsible } from "radix-ui";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "../../lib/utils.js";
import { Spinner } from "../spinner.js";

export type TaskVariant = "card" | "inline";

export type TaskProps = ComponentProps<typeof Collapsible.Root> & {
  variant?: TaskVariant;
};

export const Task = ({
  defaultOpen = true,
  variant = "card",
  className,
  ...props
}: TaskProps) => (
  <Collapsible.Root
    data-slot="task"
    data-variant={variant}
    defaultOpen={defaultOpen}
    className={cn(
      variant === "card" && "rounded-lg border border-border/60 bg-muted/20",
      variant === "inline" && "border-0 bg-transparent",
      className,
    )}
    {...props}
  />
);

export type TaskTriggerProps = Omit<ComponentProps<typeof Collapsible.Trigger>, "title"> & {
  title: ReactNode;
  live?: boolean;
  stepCount?: number;
  variant?: TaskVariant;
};

export const TaskTrigger = ({
  children,
  className,
  title,
  live = false,
  stepCount,
  variant = "card",
  ...props
}: TaskTriggerProps) => (
  <Collapsible.Trigger
    data-slot="task-trigger"
    data-variant={variant}
    className={cn(
      "flex w-full items-center gap-1.5 text-left",
      variant === "card" && [
        "px-3 py-2 text-xs font-medium",
        "hover:bg-muted/30 data-[state=open]:border-b data-[state=open]:border-border/40",
      ],
      variant === "inline" && [
        "px-0 py-0.5 text-xs font-normal text-muted-foreground",
        "hover:text-foreground/80",
      ],
      className,
    )}
    {...props}
  >
    {children ?? (
      <>
        {live ? (
          <Spinner className="size-3 shrink-0 text-primary" />
        ) : (
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={2}
            className={cn(
              "size-3 shrink-0 text-muted-foreground/70 transition-transform [[data-state=closed]_&]:-rotate-90",
              variant === "inline" && "size-2.5",
            )}
          />
        )}
        <span
          className={cn(
            "flex-1 truncate",
            live && variant === "inline" && typeof title === "string" && "font-medium text-primary",
          )}
        >
          {title}
        </span>
        {typeof stepCount === "number" && stepCount > 0 && (
          <span className="shrink-0 text-xs font-normal text-muted-foreground/80">
            {stepCount} {stepCount === 1 ? "step" : "steps"}
          </span>
        )}
      </>
    )}
  </Collapsible.Trigger>
);

export type TaskContentProps = ComponentProps<typeof Collapsible.Content> & {
  variant?: TaskVariant;
};

export const TaskContent = ({
  children,
  className,
  variant = "card",
  ...props
}: TaskContentProps) => (
  <Collapsible.Content
    data-slot="task-content"
    data-variant={variant}
    className={cn(
      "overflow-y-auto",
      variant === "card" && "max-h-48 px-3 py-2",
      variant === "inline" && "ml-1 max-h-36 border-l border-border/50 py-1 pl-2.5",
      className,
    )}
    {...props}
  >
    {children}
  </Collapsible.Content>
);

export type TaskItemProps = ComponentProps<"div"> & {
  variant?: TaskVariant;
};

export const TaskItem = ({
  children,
  className,
  variant = "card",
  ...props
}: TaskItemProps) => (
  <div
    data-slot="task-item"
    data-variant={variant}
    className={cn(
      "flex items-baseline gap-1.5 leading-none",
      variant === "card" && "text-xs",
      variant === "inline" && "text-xs text-muted-foreground",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);
