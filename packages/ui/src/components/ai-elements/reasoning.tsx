"use client";

import { Collapsible } from "radix-ui";
import { ChevronDownIcon } from "lucide-react";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import type { ComponentProps, ReactNode } from "react";
import { createContext, memo, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Streamdown } from "streamdown";

import { cn } from "../../lib/utils.js";
import { Shimmer } from "./shimmer.js";

interface ReasoningContextValue {
  isStreaming: boolean;
  isOpen: boolean;
  duration: number | undefined;
}

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

function useReasoningContext(): ReasoningContextValue {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error("Reasoning components must be used within Reasoning");
  }
  return context;
}

export type ReasoningProps = ComponentProps<typeof Collapsible.Root> & {
  isStreaming?: boolean;
  defaultOpen?: boolean;
  duration?: number;
};

const MS_IN_S = 1000;

export const Reasoning = memo(function Reasoning({
  className,
  isStreaming = false,
  defaultOpen,
  duration: durationProp,
  children,
  ...props
}: ReasoningProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen ?? false);
  const [duration, setDuration] = useState<number | undefined>(durationProp);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isStreaming) {
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
      }
      return;
    }

    if (startTimeRef.current !== null) {
      setDuration(Math.max(1, Math.ceil((Date.now() - startTimeRef.current) / MS_IN_S)));
      startTimeRef.current = null;
    }
  }, [isStreaming]);

  useEffect(() => {
    if (!isStreaming && durationProp !== undefined) {
      setDuration(durationProp);
    }
  }, [durationProp, isStreaming]);

  const contextValue = useMemo(
    () => ({ duration, isOpen, isStreaming }),
    [duration, isOpen, isStreaming],
  );

  return (
    <ReasoningContext.Provider value={contextValue}>
      <Collapsible.Root
        data-slot="reasoning"
        open={isOpen}
        onOpenChange={setIsOpen}
        className={cn("py-0.5", className)}
        {...props}
      >
        {children}
      </Collapsible.Root>
    </ReasoningContext.Provider>
  );
});

export type ReasoningTriggerProps = ComponentProps<typeof Collapsible.Trigger> & {
  getThinkingMessage?: (isStreaming: boolean, duration?: number) => ReactNode;
};

const defaultGetThinkingMessage = (isStreaming: boolean, duration?: number): ReactNode => {
  if (isStreaming || duration === 0) {
    return <Shimmer duration={1.5}>Thinking…</Shimmer>;
  }
  if (duration === undefined) {
    return "Thought for a few seconds";
  }
  return `Thought for ${duration}s`;
};

export const ReasoningTrigger = memo(function ReasoningTrigger({
  className,
  children,
  getThinkingMessage = defaultGetThinkingMessage,
  ...props
}: ReasoningTriggerProps) {
  const { isStreaming, duration } = useReasoningContext();

  return (
    <Collapsible.Trigger
      data-slot="reasoning-trigger"
      className={cn(
        "flex w-full items-center gap-1.5 px-0 py-0.5 text-left text-xs font-normal text-muted-foreground hover:text-foreground/80",
        className,
      )}
      {...props}
    >
      {children ?? (
        <>
          <ChevronDownIcon className="size-2.5 shrink-0 text-muted-foreground/70 transition-transform [[data-state=closed]_&]:-rotate-90" />
          <span>{getThinkingMessage(isStreaming, duration)}</span>
        </>
      )}
    </Collapsible.Trigger>
  );
});

export type ReasoningContentProps = ComponentProps<typeof Collapsible.Content> & {
  children: string;
};

const streamdownPlugins = { cjk, code, math, mermaid };

export const ReasoningContent = memo(function ReasoningContent({
  className,
  children,
  ...props
}: ReasoningContentProps) {
  return (
    <Collapsible.Content
      data-slot="reasoning-content"
      className={cn(
        "ml-1 max-h-48 overflow-y-auto border-l border-border/50 py-1 pl-2.5 text-xs leading-relaxed text-muted-foreground",
        className,
      )}
      {...props}
    >
      <Streamdown plugins={streamdownPlugins}>{children}</Streamdown>
    </Collapsible.Content>
  );
});
