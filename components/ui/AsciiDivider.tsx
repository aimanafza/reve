"use client";

interface AsciiDividerProps {
  variant?: "dots" | "block" | "line" | "empty-state";
  label?: string;
  className?: string;
}

export function AsciiDivider({ variant = "dots", label, className = "" }: AsciiDividerProps) {
  if (variant === "block") {
    return (
      <div className={`font-mono text-xs overflow-hidden ${className}`} style={{ color: "var(--border)", letterSpacing: "0.05em" }}>
        {"▓".repeat(80)}
      </div>
    );
  }

  if (variant === "line") {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        {label && (
          <span className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
            {label}
          </span>
        )}
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>
    );
  }

  if (variant === "empty-state") {
    return (
      <div className={`font-mono text-xs text-center leading-relaxed ${className}`} style={{ color: "var(--text-secondary)" }}>
        <pre>{`    ┌─────────────────────┐
    │  ·  ·  ·  ·  ·  ·  │
    │  ·  ${label || "no work yet"} ·  │
    │  ·  ·  ·  ·  ·  ·  │
    └─────────────────────┘`}</pre>
      </div>
    );
  }

  // dots
  return (
    <div className={`font-mono text-xs ${className}`} style={{ color: "var(--border)" }}>
      {"·  ".repeat(26)}
    </div>
  );
}
