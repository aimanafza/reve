"use client";

import { useState, useEffect, useRef } from "react";
import type { AppState, Annotation, Brief, GarmentZone } from "@/lib/types";
import { AnnotatableImage, type PrefillEdit } from "@/components/AnnotatableImage";

// ─── helpers ────────────────────────────────────────────────────────────────

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };
const serif: React.CSSProperties = { fontFamily: "'Cormorant Garamond', serif" };
const sans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

function stateLabel(s: AppState): string {
  switch (s) {
    case "brief":      return "brief — describe your garment";
    case "generating": return "sketch — designer is working";
    case "feedback":   return "feedback — annotate the sketch";
    case "revising":   return "revision — applying your notes";
    case "approved":   return "approved — ready to sew";
  }
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function CommissionDemo() {
  const [appState, setAppState]             = useState<AppState>("brief");
  const [brief, setBrief]                   = useState<Brief>({ description: "", fabric: "", occasion: "", budget: "" });
  const [sketchUrl, setSketchUrl]           = useState<string | null>(null);
  const [sketchPrompt, setSketchPrompt]     = useState("");
  const [customerAnnotations, setCustomerAnnotations] = useState<Annotation[]>([]);
  const [designerAnnotations, setDesignerAnnotations] = useState<Annotation[]>([]);
  const [revisionCount, setRevisionCount]   = useState(0);
  const [dotCount, setDotCount]             = useState(1);
  const [isGenerating, setIsGenerating]     = useState(false);
  const [editablePrompt, setEditablePrompt] = useState("");
  const [prefill, setPrefill]               = useState<PrefillEdit | undefined>();
  const designerColRef                      = useRef<HTMLDivElement>(null);

  // dot animation
  useEffect(() => {
    const t = setInterval(() => setDotCount((d) => (d >= 3 ? 1 : d + 1)), 500);
    return () => clearInterval(t);
  }, []);

  // build prompt when brief fields change
  useEffect(() => {
    if (!brief.description) return;
    setEditablePrompt(
      `${brief.description}${brief.fabric ? `, fabric: ${brief.fabric}` : ""}${brief.occasion ? `, occasion: ${brief.occasion}` : ""}. photorealistic fashion photography, the garment worn by a model, full body shot, clean studio background, soft natural lighting, editorial fashion magazine quality, high detail fabric texture, show drape and movement of the fabric`
    );
  }, [brief.description, brief.fabric, brief.occasion]);

  const dots = "·".repeat(dotCount);

  // ─── generate ────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/reve/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: editablePrompt }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSketchUrl(data.imageUrl);
      setSketchPrompt(editablePrompt);
    } catch (err) {
      alert("Generation failed: " + (err instanceof Error ? err.message : "unknown error"));
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── shared styles ────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    ...sans, width: "100%",
    background: "var(--surface)", border: "0.5px solid var(--border)",
    padding: "10px 14px", fontSize: 13, borderRadius: 2,
    color: "var(--text-primary)", outline: "none",
  };

  const filledBtn: React.CSSProperties = {
    ...sans, background: "var(--text-primary)", color: "var(--bg)",
    border: "none", padding: 14, width: "100%", fontSize: 13,
    letterSpacing: "0.08em", cursor: "pointer", borderRadius: 0,
  };

  const outlineBtn: React.CSSProperties = {
    ...sans, background: "transparent", color: "var(--text-primary)",
    border: "0.5px solid var(--text-primary)", padding: 14,
    fontSize: 13, letterSpacing: "0.06em", cursor: "pointer", borderRadius: 0,
  };

  const colStyle: React.CSSProperties = {
    flex: 1, overflowY: "auto", padding: 40, height: "calc(100vh - 48px)",
  };

  const colHeader: React.CSSProperties = {
    ...mono, fontSize: 10, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: "0.15em",
    position: "sticky", top: 0, background: "var(--bg)",
    borderBottom: "0.5px solid var(--border)",
    padding: "12px 0", marginBottom: 32, zIndex: 10,
  };

  // ─── progress dots ────────────────────────────────────────────────────────

  const stateOrder: AppState[] = ["brief", "generating", "feedback", "revising", "approved"];
  const currentIdx = stateOrder.indexOf(appState);
  const dotThresholds = [0, 1, 2, 4];

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ height: "100vh", overflow: "hidden", background: "var(--bg)" }}>

      {/* ── Top bar ── */}
      <div style={{ height: 48, borderBottom: "0.5px solid var(--border)", display: "flex", alignItems: "center", padding: "0 24px", justifyContent: "space-between" }}>
        <span style={{ ...serif, fontStyle: "italic", fontSize: 20 }}>reveal</span>
        <span style={{ ...mono, fontSize: 11, color: "var(--text-muted)" }}>{stateLabel(appState)}</span>
        <div style={{ display: "flex", gap: 6 }}>
          {dotThresholds.map((threshold, i) => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: currentIdx >= threshold ? "var(--text-primary)" : "var(--border)" }} />
          ))}
        </div>
      </div>

      {/* ── Two columns ── */}
      <div style={{ display: "flex", height: "calc(100vh - 48px)" }}>

        {/* ══════════════ CUSTOMER COLUMN ══════════════ */}
        <div style={{ ...colStyle, borderRight: "0.5px solid var(--border)" }}>
          <div style={colHeader}>customer</div>

          {/* brief */}
          {appState === "brief" && (
            <>
              <h1 style={{ ...serif, fontSize: 38, fontWeight: 300, lineHeight: 1.1, marginBottom: 8 }}>
                what would you like made?
              </h1>
              <p style={{ ...sans, fontSize: 14, color: "var(--text-muted)", marginBottom: 40, maxWidth: 420, lineHeight: 1.6 }}>
                describe your garment — fabric, silhouette, occasion, details. your designer will sketch it before a single stitch is made.
              </p>

              <div style={{ marginBottom: 32 }}>
                <FabricUpload value={brief.fabricPhoto} onChange={(v) => setBrief((b) => ({ ...b, fabricPhoto: v }))} />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ ...mono, fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 8 }}>describe your garment</label>
                <textarea
                  value={brief.description}
                  onChange={(e) => setBrief((b) => ({ ...b, description: e.target.value }))}
                  placeholder="e.g. a midi dress in raw dupioni silk, champagne or ivory tones. structured shoulders, low open back with a keyhole. a-line skirt that falls to the ankle. something i could wear to a gallery opening or wedding..."
                  style={{ ...inputStyle, minHeight: 160, lineHeight: 1.6, fontSize: 15, resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", gap: 12, marginBottom: 40 }}>
                {([{ label: "fabric / material", key: "fabric" }, { label: "occasion", key: "occasion" }, { label: "budget", key: "budget" }] as { label: string; key: keyof Brief }[]).map(({ label, key }) => (
                  <div key={key} style={{ flex: 1 }}>
                    <label style={{ ...mono, fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>{label}</label>
                    <input value={(brief[key] as string) || ""} onChange={(e) => setBrief((b) => ({ ...b, [key]: e.target.value }))} style={inputStyle} />
                  </div>
                ))}
              </div>

              <button
                onClick={() => setAppState("generating")}
                disabled={!brief.description}
                style={{ ...filledBtn, opacity: brief.description ? 1 : 0.4, cursor: brief.description ? "pointer" : "not-allowed" }}
                onMouseEnter={(e) => brief.description && (e.currentTarget.style.opacity = "0.8")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = brief.description ? "1" : "0.4")}
              >
                send to designer →
              </button>
            </>
          )}

          {/* generating */}
          {appState === "generating" && (
            <>
              {brief.fabricPhoto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brief.fabricPhoto} alt="fabric" style={{ maxHeight: 200, width: "100%", objectFit: "cover", border: "0.5px solid var(--border)", marginBottom: 20, display: "block" }} />
              )}
              <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", padding: 24, marginBottom: 20 }}>
                <p style={{ ...serif, fontStyle: "italic", fontSize: 18, marginBottom: 12 }}>{brief.description}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[brief.fabric, brief.occasion, brief.budget].filter(Boolean).map((v, i) => (
                    <span key={i} style={{ ...mono, fontSize: 10, color: "var(--text-muted)" }}>{i > 0 ? "· " : ""}{v}</span>
                  ))}
                </div>
              </div>
              <p style={{ ...mono, fontSize: 11, color: "var(--text-muted)" }}>· · · your designer is sketching{dots}</p>
            </>
          )}

          {/* feedback — customer annotates */}
          {appState === "feedback" && sketchUrl && (
            <>
              <h2 style={{ ...serif, fontSize: 26, fontWeight: 300, marginBottom: 8 }}>
                {revisionCount === 0 ? "here is your initial sketch" : `revised sketch — round ${revisionCount}`}
              </h2>
              <p style={{ ...sans, fontSize: 13, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.6 }}>
                click any part of the sketch to leave feedback — neckline, sleeves, hem, anything.
              </p>

              <AnnotatableImage
                imageUrl={sketchUrl}
                mode="customer"
                annotations={customerAnnotations}
                onAnnotationAdd={(ann) => setCustomerAnnotations((prev) => [...prev, ann])}
                onAnnotationUpdate={() => {}}
              />

              {/* Saved annotations list */}
              {customerAnnotations.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  {customerAnnotations.map((ann) => (
                    <div key={ann.id} style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                      <span style={{ ...mono, fontSize: 11, color: "var(--text-primary)", whiteSpace: "nowrap" }}>{ann.zone}</span>
                      <span style={{ ...sans, fontSize: 13, color: "var(--text-muted)", flex: 1 }}>· &ldquo;{ann.text.slice(0, 60)}{ann.text.length > 60 ? "…" : ""}&rdquo;</span>
                      <button
                        onClick={() => setCustomerAnnotations((prev) => prev.filter((a) => a.id !== ann.id))}
                        style={{ ...mono, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, padding: "2px 4px" }}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Approve */}
              <button
                onClick={() => setAppState("approved")}
                style={{ ...sans, marginTop: 24, width: "100%", padding: 14, border: "0.5px solid var(--green)", color: "var(--green)", background: "transparent", fontSize: 13, cursor: "pointer", letterSpacing: "0.06em", borderRadius: 0 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--green)"; e.currentTarget.style.color = "white"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--green)"; }}
              >
                approve this sketch ✓
              </button>

              {/* Send feedback */}
              {customerAnnotations.length > 0 && (
                <button onClick={() => setAppState("revising")} style={{ ...filledBtn, marginTop: 12 }}>
                  send feedback to designer →
                </button>
              )}
            </>
          )}

          {/* revising — customer sees read-only sketch + status */}
          {appState === "revising" && sketchUrl && (
            <>
              <h2 style={{ ...serif, fontSize: 26, fontWeight: 300, marginBottom: 8 }}>feedback sent</h2>
              <p style={{ ...sans, fontSize: 13, color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.6 }}>
                your designer is applying your notes with reve ai.
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sketchUrl} alt="sketch" style={{ width: "100%", border: "0.5px solid var(--border)", marginBottom: 24, display: "block" }} />
              {customerAnnotations.map((ann) => (
                <div key={ann.id} style={{ background: "var(--surface)", border: "0.5px solid var(--border)", padding: 12, marginBottom: 8 }}>
                  <p style={{ ...mono, fontSize: 10, color: "var(--red)", marginBottom: 4 }}>{ann.zone}</p>
                  <p style={{ ...sans, fontSize: 13 }}>{ann.text}</p>
                  {designerAnnotations.find((d) => d.zone === ann.zone && d.revisedImageUrl) ? (
                    <p style={{ ...mono, fontSize: 10, color: "var(--green)", marginTop: 8 }}>✓ revised</p>
                  ) : (
                    <p style={{ ...mono, fontSize: 10, color: "var(--text-muted)", marginTop: 8 }}>· revising</p>
                  )}
                </div>
              ))}
              <p style={{ ...mono, fontSize: 11, color: "var(--text-muted)", marginTop: 16 }}>· · · designer is revising{dots}</p>
            </>
          )}

          {/* approved */}
          {appState === "approved" && (
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
              <p style={{ ...serif, fontStyle: "italic", fontSize: 40, marginBottom: 12 }}>sketch approved.</p>
              <p style={{ ...sans, fontSize: 14, color: "var(--text-muted)", marginBottom: 32, maxWidth: 360, lineHeight: 1.6 }}>
                your designer will now begin making your piece. every detail has been agreed — you&apos;ll love it.
              </p>
              {sketchUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sketchUrl} alt="approved" style={{ maxWidth: 320, border: "0.5px solid var(--border)", display: "block" }} />
              )}
            </div>
          )}
        </div>

        {/* ══════════════ DESIGNER COLUMN ══════════════ */}
        <div ref={designerColRef} style={colStyle}>
          <div style={colHeader}>designer</div>

          {/* brief */}
          {appState === "brief" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100% - 60px)" }}>
              <p style={{ ...mono, fontSize: 13, color: "var(--text-faint)", lineHeight: 1.8, textAlign: "center" }}>
                · · · · · · · · · ·<br />brief pending<br />· · · · · · · · · ·
              </p>
              <p style={{ ...sans, fontSize: 13, color: "var(--text-faint)", marginTop: 24, textAlign: "center" }}>customer brief will appear here</p>
            </div>
          )}

          {/* generating */}
          {appState === "generating" && (
            <>
              {brief.fabricPhoto && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={brief.fabricPhoto} alt="fabric reference" style={{ maxHeight: 180, width: "100%", objectFit: "cover", border: "0.5px solid var(--border)", marginBottom: 8, display: "block" }} />
                  <p style={{ ...mono, fontSize: 10, color: "var(--text-muted)", marginBottom: 20 }}>customer&apos;s fabric reference</p>
                </>
              )}

              <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", padding: 24, marginBottom: 24 }}>
                <p style={{ ...serif, fontStyle: "italic", fontSize: 18, marginBottom: 12 }}>{brief.description}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[brief.fabric, brief.occasion, brief.budget].filter(Boolean).map((v, i) => (
                    <span key={i} style={{ ...mono, fontSize: 10, color: "var(--text-muted)" }}>{i > 0 ? "· " : ""}{v}</span>
                  ))}
                </div>
              </div>

              <p style={{ ...mono, fontSize: 10, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>generate with reve</p>
              {brief.fabricPhoto && (
                <p style={{ ...sans, fontSize: 12, color: "var(--text-faint)", marginBottom: 12 }}>
                  reve will use the customer&apos;s fabric photo as the base and render the garment design on it
                </p>
              )}

              <textarea
                value={editablePrompt}
                onChange={(e) => setEditablePrompt(e.target.value)}
                style={{ ...inputStyle, minHeight: 120, lineHeight: 1.6, resize: "vertical", marginBottom: 16 }}
              />

              {!isGenerating && !sketchUrl && (
                <button onClick={handleGenerate} style={filledBtn}>sketch with reve →</button>
              )}
              {isGenerating && (
                <p style={{ ...mono, fontSize: 13, color: "var(--text-muted)" }}>sketching{dots}</p>
              )}
              {sketchUrl && !isGenerating && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sketchUrl} alt="generated" style={{ width: "100%", border: "0.5px solid var(--border)", marginBottom: 16, display: "block" }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setCustomerAnnotations([]); setDesignerAnnotations([]); setAppState("feedback"); }} style={{ ...filledBtn, flex: 1, padding: "12px 16px" }}>
                      share with customer →
                    </button>
                    <button onClick={() => { setSketchUrl(null); }} style={{ ...outlineBtn, flex: 1, padding: "12px 16px" }}>
                      sketch again
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* feedback — designer sees read-only sketch, awaits */}
          {appState === "feedback" && sketchUrl && (
            <>
              <h2 style={{ ...serif, fontSize: 24, fontWeight: 300, marginBottom: 8 }}>sketch shared</h2>
              <p style={{ ...sans, fontSize: 13, color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.6 }}>
                customer is reviewing and annotating the sketch
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sketchUrl} alt="sketch" style={{ width: "100%", border: "0.5px solid var(--border)", display: "block" }} />
              <p style={{ ...mono, fontSize: 11, color: "var(--text-muted)", marginTop: 16 }}>· · · awaiting customer feedback{dots}</p>
            </>
          )}

          {/* revising — designer uses AnnotatableImage to apply edits */}
          {appState === "revising" && sketchUrl && (
            <>
              <h2 style={{ ...serif, fontSize: 26, fontWeight: 300, marginBottom: 8 }}>customer feedback</h2>
              <p style={{ ...sans, fontSize: 13, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.6 }}>
                click any zone on the image to edit it with reve, or use the cards below to address specific notes.
              </p>

              <AnnotatableImage
                imageUrl={sketchUrl}
                mode="designer"
                annotations={designerAnnotations}
                basePrompt={sketchPrompt}
                prefillEdit={prefill}
                onAnnotationAdd={(ann) => {
                  setDesignerAnnotations((prev) => {
                    const without = prev.filter((a) => a.id !== ann.id);
                    return [...without, ann];
                  });
                }}
                onAnnotationUpdate={(id, newUrl) => {
                  setSketchUrl(newUrl);
                }}
              />

              {/* Customer feedback cards */}
              {customerAnnotations.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <p style={{ ...mono, fontSize: 10, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    customer notes
                  </p>
                  {customerAnnotations.map((ann) => {
                    const addressed = designerAnnotations.some((d) => d.zone === ann.zone && d.revisedImageUrl);
                    return (
                      <div
                        key={ann.id}
                        style={{
                          borderLeft: "2px solid var(--red)",
                          background: "var(--surface)",
                          padding: "12px 16px",
                          marginBottom: 8,
                        }}
                      >
                        <p style={{ ...mono, fontSize: 10, color: "var(--red)", marginBottom: 6 }}>
                          {ann.zone}
                        </p>
                        <p style={{ ...sans, fontSize: 13, fontStyle: "italic", color: "var(--text-primary)", lineHeight: 1.5, marginBottom: 10 }}>
                          &ldquo;{ann.text}&rdquo;
                        </p>
                        {addressed ? (
                          <span style={{ ...mono, fontSize: 10, color: "var(--green)" }}>✓ addressed</span>
                        ) : (
                          <button
                            onClick={() => {
                              setPrefill({ zone: ann.zone as GarmentZone, text: ann.text, nonce: Date.now() });
                              designerColRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            style={{ ...sans, background: "transparent", border: "0.5px solid var(--text-primary)", color: "var(--text-primary)", fontSize: 11, padding: "5px 12px", cursor: "pointer", borderRadius: 0 }}
                          >
                            address this →
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Share back */}
              <button
                onClick={() => {
                  setRevisionCount((c) => c + 1);
                  setCustomerAnnotations([]);
                  setDesignerAnnotations([]);
                  setPrefill(undefined);
                  setAppState("feedback");
                }}
                style={{ ...filledBtn, marginTop: 24 }}
              >
                share updated sketch →
              </button>
            </>
          )}

          {/* approved */}
          {appState === "approved" && (
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
              <p style={{ ...serif, fontStyle: "italic", fontSize: 40, marginBottom: 12 }}>start sewing.</p>
              <p style={{ ...sans, fontSize: 14, color: "var(--text-muted)", marginBottom: 32, maxWidth: 360, lineHeight: 1.6 }}>
                the customer has approved. every stitch from here follows this sketch.
              </p>
              {sketchUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sketchUrl} alt="approved" style={{ maxWidth: 320, border: "0.5px solid var(--border)", marginBottom: 24, display: "block" }} />
              )}
              <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", padding: 16, marginBottom: 24, maxWidth: 320 }}>
                <p style={{ ...serif, fontStyle: "italic", fontSize: 14, marginBottom: 8 }}>{brief.description}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[brief.fabric, brief.occasion, brief.budget].filter(Boolean).map((v, i) => (
                    <span key={i} style={{ ...mono, fontSize: 10, color: "var(--text-muted)" }}>{i > 0 ? "· " : ""}{v}</span>
                  ))}
                </div>
              </div>
              <button onClick={() => sketchUrl && window.open(sketchUrl, "_blank")} style={{ ...outlineBtn, maxWidth: 320 }}>
                download approved files →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── FabricUpload ─────────────────────────────────────────────────────────────

function FabricUpload({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => { if (e.target?.result) onChange(e.target.result as string); };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        style={{ border: `1px dashed ${dragging ? "var(--text-muted)" : "var(--border)"}`, background: "var(--surface)", padding: 32, cursor: "pointer", textAlign: "center" }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="fabric" style={{ maxHeight: 160, maxWidth: "100%", display: "block", margin: "0 auto" }} />
        ) : (
          <>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--text-muted)" }}>drag fabric photo here, or click to upload</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-faint)", marginTop: 8 }}>optional — helps the designer understand your material</p>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
}
