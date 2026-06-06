"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// Seed images for the demo — editorial, desaturated artworks
const SEED_IMAGES = [
  "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80", // fashion/dress editorial
  "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&q=80", // clothing detail
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80", // fashion editorial
];

const EXAMPLE_PROMPTS = [
  "warmer tones",
  "less structured",
  "add texture to the fabric",
  "softer silhouette",
  "more dramatic shadows",
  "ivory instead of white",
];

interface ImageState {
  url: string;
  loading: boolean;
  error: string | null;
}

export function InteractiveDemo() {
  const [imageState, setImageState] = useState<ImageState>({
    url: SEED_IMAGES[0],
    loading: false,
    error: null,
  });
  const [input, setInput] = useState("");
  const [editHistory, setEditHistory] = useState<string[]>([]);
  const [asciiFrame, setAsciiFrame] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // ASCII loading spinner frames
  const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (imageState.loading) {
      interval = setInterval(() => {
        setAsciiFrame((f) => (f + 1) % spinnerFrames.length);
      }, 80);
    }
    return () => clearInterval(interval);
  }, [imageState.loading]);

  const handleEdit = useCallback(async (editPrompt: string) => {
    if (!editPrompt.trim() || imageState.loading) return;

    setImageState((s) => ({ ...s, loading: true, error: null }));

    try {
      const res = await fetch("/api/reve/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: imageState.url, prompt: editPrompt }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "edit failed");

      const newUrl = data.dataUrl;
      if (!newUrl) throw new Error("no image in response");

      setImageState({ url: newUrl, loading: false, error: null });
      setEditHistory((h) => [...h.slice(-4), editPrompt]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "something went wrong";
      setImageState((s) => ({ ...s, loading: false, error: message }));
    }
  }, [imageState.url, imageState.loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleEdit(input), 300);
    setInput("");
  };

  const handleExampleClick = (example: string) => {
    setInput(example);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <section className="px-8 py-24 max-w-6xl mx-auto">
      {/* Label */}
      <div className="mb-8 flex items-center gap-3">
        <span className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
          02 — interactive demo
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0" style={{ border: "0.5px solid var(--border)" }}>
        {/* Left — image */}
        <div className="relative aspect-square overflow-hidden" style={{ background: "var(--surface)" }}>
          {imageState.loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <span
                className="font-mono text-4xl"
                style={{ color: "var(--text-secondary)" }}
              >
                {spinnerFrames[asciiFrame]}
              </span>
              <span className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                generating preview
              </span>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageState.url}
              alt="commission artwork"
              className="w-full h-full object-cover fade-in"
              style={{ filter: "saturate(0.7) contrast(1.05)" }}
            />
          )}

          {/* Edit history overlay */}
          {editHistory.length > 0 && (
            <div
              className="absolute bottom-0 left-0 right-0 p-3"
              style={{ background: "linear-gradient(to top, rgba(10,10,10,0.9), transparent)" }}
            >
              {editHistory.slice(-2).map((edit, i) => (
                <div key={i} className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                  ↳ {edit}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right — input */}
        <div
          className="flex flex-col justify-between p-8"
          style={{ borderLeft: "0.5px solid var(--border)" }}
        >
          <div>
            <h3
              className="text-sm mb-2"
              style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans', sans-serif" }}
            >
              leave a visual note
            </h3>
            <p
              className="font-mono text-xs mb-8 leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              Try: &quot;warmer tones&quot; or &quot;less structured&quot; or &quot;add texture to the fabric&quot;
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ borderBottom: "0.5px solid var(--border)" }} className="pb-3 mb-4">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="describe what you want to change..."
                  className="w-full bg-transparent text-sm outline-none"
                  style={{
                    color: "var(--text-primary)",
                    fontFamily: "'DM Sans', sans-serif",
                    caretColor: "var(--accent)",
                  }}
                  disabled={imageState.loading}
                />
              </div>

              {imageState.error && (
                <div className="mb-4 font-mono text-xs" style={{ color: "var(--danger)" }}>
                  error: {imageState.error}
                </div>
              )}

              <button
                type="submit"
                disabled={!input.trim() || imageState.loading}
                className="font-mono text-xs px-4 py-2 transition-all duration-200"
                style={{
                  border: "0.5px solid var(--border)",
                  color: "var(--text-secondary)",
                  background: "transparent",
                  cursor: input.trim() && !imageState.loading ? "pointer" : "not-allowed",
                  opacity: input.trim() && !imageState.loading ? 1 : 0.4,
                }}
                onMouseEnter={(e) => {
                  if (input.trim() && !imageState.loading) {
                    e.currentTarget.style.background = "var(--accent)";
                    e.currentTarget.style.color = "var(--bg)";
                    e.currentTarget.style.borderColor = "var(--accent)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                {imageState.loading ? `${spinnerFrames[asciiFrame]} generating` : "generate preview →"}
              </button>
            </form>
          </div>

          {/* Example prompts */}
          <div>
            <div className="font-mono text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
              suggestions
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => handleExampleClick(p)}
                  className="font-mono text-xs px-3 py-1 transition-colors duration-150"
                  style={{
                    border: "0.5px solid var(--border)",
                    color: "var(--text-secondary)",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--text-secondary)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
