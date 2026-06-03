"use client";

import { useState } from "react";
import { MarkdownContent } from "./markdown-content";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export function MarkdownEditor({ value, onChange, placeholder, rows = 6 }: MarkdownEditorProps) {
  const [previewing, setPreviewing] = useState(false);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPreviewing(false)}
          className={`text-xs px-2 py-0.5 rounded ${!previewing ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setPreviewing(true)}
          className={`text-xs px-2 py-0.5 rounded ${previewing ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Preview
        </button>
      </div>
      {previewing ? (
        <div className="rounded-md border border-border p-3 min-h-[100px] bg-background">
          {value.trim() ? (
            <MarkdownContent content={value} />
          ) : (
            <p className="text-sm text-muted-foreground italic">Nothing to preview</p>
          )}
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="input-field resize-y font-mono text-sm"
        />
      )}
    </div>
  );
}
