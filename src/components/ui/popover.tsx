"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface PopoverProps {
  children: React.ReactNode;
  content: React.ReactNode;
  delay?: number;
  position?: "auto" | "top" | "bottom";
}

export function Popover({ children, content, delay = 300, position: positionProp = "auto" }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [position, setPosition] = useState<"bottom" | "top">("bottom");
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function handleEnter() {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(true), delay);
  }

  function handleLeave() {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  }

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const showAbove = positionProp === "top" || (positionProp === "auto" && spaceBelow < 200);
      setPosition(showAbove ? "top" : "bottom");
      setCoords({
        top: showAbove ? rect.top + window.scrollY : rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
      });
    }
  }, [open, positionProp]);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}
      {open && coords && createPortal(
        <div
          ref={popoverRef}
          className={`fixed z-[9999] w-72 rounded-md border border-border bg-card p-3 shadow-lg text-sm animate-in fade-in-0 zoom-in-95 duration-150`}
          style={{
            top: position === "top" ? undefined : coords.top,
            bottom: position === "top" ? window.innerHeight - coords.top + 6 : undefined,
            left: coords.left,
          }}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          {content}
        </div>,
        document.body
      )}
    </div>
  );
}
