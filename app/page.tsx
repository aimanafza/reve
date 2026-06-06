"use client";

import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <main style={{ background: "var(--bg)", minHeight: "100vh" }}>
      {/* Nav */}
      <nav
        style={{
          padding: "24px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: "italic",
            fontSize: 22,
            color: "var(--text-primary)",
          }}
        >
          reveal
        </span>
        <button
          onClick={() => router.push("/commission/demo")}
          style={{
            border: "0.5px solid var(--text-primary)",
            background: "transparent",
            color: "var(--text-primary)",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            padding: "8px 16px",
            cursor: "pointer",
            letterSpacing: "0.04em",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--text-primary)";
            e.currentTarget.style.color = "var(--bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
        >
          try the demo →
        </button>
      </nav>

      {/* Hero */}
      <section
        style={{
          minHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 32px",
          maxWidth: 860,
        }}
      >
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: "var(--text-muted)",
            letterSpacing: "0.1em",
            marginBottom: 24,
          }}
        >
          reveal · tailor-made, agreed on first
        </p>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 72,
            lineHeight: 1.0,
            color: "var(--text-primary)",
            fontWeight: 300,
            marginBottom: 24,
          }}
        >
          The space between what you imagine and what gets made.
        </h1>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 16,
            color: "var(--text-muted)",
            marginBottom: 48,
            maxWidth: 480,
            lineHeight: 1.6,
          }}
        >
          Describe a garment. Your tailor sketches it with AI. You mark up exactly what to change.
          Sewing only starts when you&apos;re certain.
        </p>
        <button
          onClick={() => router.push("/commission/demo")}
          style={{
            background: "var(--text-primary)",
            color: "var(--bg)",
            border: "none",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            letterSpacing: "0.06em",
            padding: "16px 32px",
            cursor: "pointer",
            width: "fit-content",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          start a commission →
        </button>
      </section>

      {/* How It Works */}
      <section
        style={{
          padding: "96px 32px",
          borderTop: "0.5px solid var(--border)",
        }}
      >
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: "var(--text-muted)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: 48,
          }}
        >
          how it works
        </p>
        <div style={{ display: "flex" }}>
          {[
            {
              num: "01",
              title: "describe your fabric",
              body: "Upload a photo of your material and explain the silhouette, occasion, and any details.",
            },
            {
              num: "02",
              title: "designer sketches",
              body: "Your tailor uses Reve AI to generate a precise technical fashion sketch from your brief.",
            },
            {
              num: "03",
              title: "annotate the sketch",
              body: "Click any zone — neckline, waist, sleeves, hem — and describe exactly what to change.",
            },
            {
              num: "04",
              title: "approve, then sew",
              body: "Revisions continue until you're certain. Only then does the sewing begin.",
            },
          ].map((step, i) => (
            <div
              key={step.num}
              style={{
                flex: 1,
                paddingLeft: 32,
                paddingRight: 32,
                borderRight: i < 3 ? "0.5px solid var(--border)" : "none",
              }}
            >
              <p
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginBottom: 12,
                }}
              >
                {step.num}
              </p>
              <h3
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 22,
                  color: "var(--text-primary)",
                  fontWeight: 400,
                  marginBottom: 8,
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                }}
              >
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: "32px",
          borderTop: "0.5px solid var(--border)",
        }}
      >
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: "var(--text-muted)",
            marginBottom: 8,
          }}
        >
          reveal · made at design meetup × reve makeathon 2026
        </p>
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: "var(--text-faint)",
          }}
        >
          ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓ ▓
        </p>
      </footer>
    </main>
  );
}
