"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────
type PageState = "brief" | "generating" | "feedback" | "revised" | "approved";

interface BriefData {
  description: string;
  medium: string;
  budget: string;
  timeline: string;
}

interface Annotation {
  id: number;
  x: number; // % of image width
  y: number; // % of image height
  w: number;
  h: number;
  text: string;
}

interface DrawBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ── Constants ─────────────────────────────────────────────────────────
const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

// ── Shared style tokens ───────────────────────────────────────────────
const T = {
  mono: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    color: "#6b6b6b",
  } as React.CSSProperties,

  display: {
    fontFamily: "'Cormorant Garamond', serif",
    fontWeight: 300,
    color: "#f0ede8",
  } as React.CSSProperties,

  body: {
    fontFamily: "'DM Sans', sans-serif",
    color: "#c8c4be",
    fontSize: "14px",
    lineHeight: 1.65,
  } as React.CSSProperties,

  field: {
    width: "100%",
    background: "transparent",
    border: "0.5px solid #1f1f1f",
    color: "#f0ede8",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "14px",
    padding: "12px",
    outline: "none",
    caretColor: "#e8e0d4",
  } as React.CSSProperties,

  btn: {
    background: "transparent",
    border: "0.5px solid #f0ede8",
    color: "#f0ede8",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    padding: "10px 20px",
    cursor: "pointer",
    letterSpacing: "0.05em",
    transition: "background 150ms, color 150ms",
  } as React.CSSProperties,

  card: {
    background: "#161616",
    border: "0.5px solid #1f1f1f",
    padding: "16px",
  } as React.CSSProperties,
};

// ── Root page ─────────────────────────────────────────────────────────
export default function CommissionCanvas() {
  const [pageState, setPageState] = useState<PageState>("brief");
  const [brief, setBrief] = useState<BriefData>({
    description: "",
    medium: "",
    budget: "",
    timeline: "",
  });
  const [artistPrompt, setArtistPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [revisedImage, setRevisedImage] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  // Annotation drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawBox, setDrawBox] = useState<DrawBox | null>(null);
  const [pendingBox, setPendingBox] = useState<DrawBox | null>(null);
  const [pendingText, setPendingText] = useState("");

  // Loading states
  const [generatingMockup, setGeneratingMockup] = useState(false);
  const [applyingEdit, setApplyingEdit] = useState(false);
  const [activeEditAnnId, setActiveEditAnnId] = useState<number | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Spinner
  const [spinFrame, setSpinFrame] = useState(0);
  const spinRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Confetti
  const [showConfetti, setShowConfetti] = useState(false);

  // Image wrapper ref (customer panel)
  const imageWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (spinRef.current) clearInterval(spinRef.current);
    };
  }, []);

  const startSpin = () => {
    spinRef.current = setInterval(
      () => setSpinFrame((f) => (f + 1) % SPINNER.length),
      80
    );
  };
  const stopSpin = () => {
    if (spinRef.current) {
      clearInterval(spinRef.current);
      spinRef.current = null;
    }
  };

  // ── Handlers ────────────────────────────────────────────────────────

  const handleSubmitBrief = () => {
    if (!brief.description.trim()) return;
    const optimized = `${brief.description.trim()}, editorial fashion illustration, pencil sketch, studio, minimal background`;
    setArtistPrompt(optimized);
    setPageState("generating");
  };

  const handleGenerate = async () => {
    if (!artistPrompt.trim() || generatingMockup) return;
    setGeneratingMockup(true);
    setApiError(null);
    startSpin();
    try {
      const res = await fetch("/api/reve/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: artistPrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "generation failed");
      setGeneratedImage(data.dataUrl);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "generation failed");
    } finally {
      setGeneratingMockup(false);
      stopSpin();
    }
  };

  const handleRegenerate = () => setGeneratedImage(null);

  const handleUploadToCustomer = () => {
    setPageState("feedback");
  };

  // Annotation drawing
  const getPct = (e: React.MouseEvent, el: HTMLDivElement) => ({
    x: Math.max(0, Math.min(100, ((e.clientX - el.getBoundingClientRect().left) / el.getBoundingClientRect().width) * 100)),
    y: Math.max(0, Math.min(100, ((e.clientY - el.getBoundingClientRect().top) / el.getBoundingClientRect().height) * 100)),
  });

  const onImgMouseDown = (e: React.MouseEvent) => {
    if (!imageWrapRef.current) return;
    if ((e.target as HTMLElement).closest("[data-ann]")) return;
    const pos = getPct(e, imageWrapRef.current);
    setIsDrawing(true);
    setDrawStart(pos);
    setDrawBox({ ...pos, w: 0, h: 0 });
    setPendingBox(null);
    setPendingText("");
  };

  const onImgMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !drawStart || !imageWrapRef.current) return;
    const pos = getPct(e, imageWrapRef.current);
    setDrawBox({
      x: Math.min(pos.x, drawStart.x),
      y: Math.min(pos.y, drawStart.y),
      w: Math.abs(pos.x - drawStart.x),
      h: Math.abs(pos.y - drawStart.y),
    });
  };

  const onImgMouseUp = () => {
    if (!isDrawing || !drawBox) return;
    setIsDrawing(false);
    if (drawBox.w > 2 && drawBox.h > 2) setPendingBox(drawBox);
    setDrawBox(null);
    setDrawStart(null);
  };

  const handleAddAnnotation = () => {
    if (!pendingBox || !pendingText.trim()) return;
    setAnnotations((prev) => [
      ...prev,
      { id: Date.now(), ...pendingBox, text: pendingText.trim() },
    ]);
    setPendingBox(null);
    setPendingText("");
  };

  const handleApplyEdit = async (ann: Annotation) => {
    if (!generatedImage || applyingEdit) return;
    setApplyingEdit(true);
    setActiveEditAnnId(ann.id);
    setApiError(null);
    startSpin();
    try {
      const res = await fetch("/api/reve/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: generatedImage, prompt: ann.text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "edit failed");
      setRevisedImage(data.dataUrl);
      setPageState("revised");
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "edit failed");
    } finally {
      setApplyingEdit(false);
      setActiveEditAnnId(null);
      stopSpin();
    }
  };

  const handleApprove = () => {
    setPageState("approved");
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 4000);
  };

  const handleMoreFeedback = () => {
    setRevisedImage(null);
    setPendingBox(null);
    setPendingText("");
    setAnnotations([]);
    setPageState("feedback");
  };

  // ── Layout ──────────────────────────────────────────────────────────
  return (
    <>
      {showConfetti && <Confetti />}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          background: "#0a0a0a",
          overflow: "hidden",
        }}
      >
        {/* Top bar */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 24px",
            borderBottom: "0.5px solid #1f1f1f",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Link
              href="/"
              style={{ ...T.mono, fontSize: "11px", textDecoration: "none" }}
            >
              ← commis
            </Link>
            <span style={{ color: "#1f1f1f" }}>·</span>
            <span style={{ ...T.mono, fontSize: "11px" }}>
              custom evening dress · demo
            </span>
          </div>
          <StateIndicator state={pageState} />
        </header>

        {/* Two-panel split */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Customer panel */}
          <Panel label="customer">
            <CustomerPanel
              state={pageState}
              brief={brief}
              setBrief={setBrief}
              onSubmitBrief={handleSubmitBrief}
              generatedImage={generatedImage}
              revisedImage={revisedImage}
              annotations={annotations}
              pendingBox={pendingBox}
              pendingText={pendingText}
              setPendingText={setPendingText}
              drawBox={drawBox}
              imageWrapRef={imageWrapRef}
              onImgMouseDown={onImgMouseDown}
              onImgMouseMove={onImgMouseMove}
              onImgMouseUp={onImgMouseUp}
              onAddAnnotation={handleAddAnnotation}
              onApprove={handleApprove}
              onMoreFeedback={handleMoreFeedback}
            />
          </Panel>

          {/* Vertical divider */}
          <div style={{ width: "0.5px", background: "#1f1f1f", flexShrink: 0 }} />

          {/* Artist panel */}
          <Panel label="artist">
            <ArtistPanel
              state={pageState}
              brief={brief}
              artistPrompt={artistPrompt}
              setArtistPrompt={setArtistPrompt}
              onGenerate={handleGenerate}
              generatingMockup={generatingMockup}
              generatedImage={generatedImage}
              revisedImage={revisedImage}
              annotations={annotations}
              onApplyEdit={handleApplyEdit}
              applyingEdit={applyingEdit}
              activeEditAnnId={activeEditAnnId}
              spinFrame={spinFrame}
              apiError={apiError}
              onUploadToCustomer={handleUploadToCustomer}
              onRegenerate={handleRegenerate}
            />
          </Panel>
        </div>
      </div>
    </>
  );
}

// ── Panel wrapper ─────────────────────────────────────────────────────
function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        overflow: "auto",
        padding: "28px 32px",
        background: "#0f0f0f",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          ...T.mono,
          fontSize: "10px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginBottom: "28px",
          fontVariantCaps: "small-caps",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

// ── State indicator ───────────────────────────────────────────────────
function StateIndicator({ state }: { state: PageState }) {
  const map: Record<PageState, { text: string; color: string }> = {
    brief: { text: "○  brief", color: "#4a4a4a" },
    generating: { text: "●  generating mockup", color: "#9a9690" },
    feedback: { text: "●  awaiting feedback", color: "#9a9690" },
    revised: { text: "●  revision shared", color: "#9a9690" },
    approved: { text: "✓  approved", color: "#2ecc71" },
  };
  const { text, color } = map[state];
  return (
    <span style={{ ...T.mono, fontSize: "11px", color }}>{text}</span>
  );
}

// ── Customer Panel ────────────────────────────────────────────────────
interface CustomerPanelProps {
  state: PageState;
  brief: BriefData;
  setBrief: (b: BriefData) => void;
  onSubmitBrief: () => void;
  generatedImage: string | null;
  revisedImage: string | null;
  annotations: Annotation[];
  pendingBox: DrawBox | null;
  pendingText: string;
  setPendingText: (t: string) => void;
  drawBox: DrawBox | null;
  imageWrapRef: React.RefObject<HTMLDivElement>;
  onImgMouseDown: (e: React.MouseEvent) => void;
  onImgMouseMove: (e: React.MouseEvent) => void;
  onImgMouseUp: () => void;
  onAddAnnotation: () => void;
  onApprove: () => void;
  onMoreFeedback: () => void;
}

function CustomerPanel({
  state, brief, setBrief, onSubmitBrief,
  generatedImage, revisedImage, annotations,
  pendingBox, pendingText, setPendingText, drawBox,
  imageWrapRef, onImgMouseDown, onImgMouseMove, onImgMouseUp,
  onAddAnnotation, onApprove, onMoreFeedback,
}: CustomerPanelProps) {

  // ── STATE: brief ──────────────────────────────────────────────────
  if (state === "brief") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "22px", maxWidth: "500px" }}>
        <h2 style={{ ...T.display, fontSize: "26px" }}>
          describe what you want made
        </h2>

        <textarea
          value={brief.description}
          onChange={(e) => setBrief({ ...brief, description: e.target.value })}
          placeholder={"an evening dress, silk, structured shoulders, ivory or champagne, something editorial..."}
          rows={6}
          style={{ ...T.field, resize: "none", lineHeight: 1.7 }}
          onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) onSubmitBrief(); }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
          {(
            [
              { key: "medium", label: "medium", placeholder: "silk, ceramics..." },
              { key: "budget", label: "budget", placeholder: "$800–1200" },
              { key: "timeline", label: "timeline", placeholder: "4–6 weeks" },
            ] as const
          ).map(({ key, label, placeholder }) => (
            <div key={key}>
              <div style={{ ...T.mono, fontSize: "10px", marginBottom: "6px" }}>
                {label}
              </div>
              <input
                type="text"
                value={brief[key]}
                onChange={(e) => setBrief({ ...brief, [key]: e.target.value })}
                placeholder={placeholder}
                style={{ ...T.field, fontSize: "13px", padding: "10px" }}
              />
            </div>
          ))}
        </div>

        <Btn onClick={onSubmitBrief} disabled={!brief.description.trim()}>
          send brief →
        </Btn>
      </div>
    );
  }

  // ── STATE: generating ─────────────────────────────────────────────
  if (state === "generating") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "500px" }}>
        <div style={{ ...T.mono, fontSize: "10px" }}>brief sent</div>
        <BriefCard brief={brief} />
        <div style={{ ...T.mono, color: "#9a9690", marginTop: "4px" }}>
          ● waiting for initial mockup
        </div>
      </div>
    );
  }

  // ── STATE: feedback ───────────────────────────────────────────────
  if (state === "feedback") {
    const img = generatedImage;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ ...T.mono, fontSize: "10px" }}>initial mockup · click any region to leave feedback</div>

        {img && (
          <div
            ref={imageWrapRef}
            style={{
              position: "relative",
              cursor: "crosshair",
              userSelect: "none",
              border: "0.5px solid #1f1f1f",
            }}
            onMouseDown={onImgMouseDown}
            onMouseMove={onImgMouseMove}
            onMouseUp={onImgMouseUp}
            onMouseLeave={onImgMouseUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img}
              alt="mockup"
              style={{ width: "100%", display: "block", pointerEvents: "none" }}
              draggable={false}
            />

            {/* Live draw box */}
            {drawBox && drawBox.w > 0 && (
              <SelectionBox box={drawBox} color="#e8e0d4" dim />
            )}

            {/* Pending box (placed, awaiting text) */}
            {pendingBox && (
              <SelectionBox box={pendingBox} color="#c0392b" dim />
            )}

            {/* Committed annotations */}
            {annotations.map((ann, i) => (
              <div
                key={ann.id}
                data-ann="true"
                style={{
                  position: "absolute",
                  left: `${ann.x}%`,
                  top: `${ann.y}%`,
                  width: `${ann.w}%`,
                  height: `${ann.h}%`,
                  border: "1px dashed #c0392b",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "-20px",
                    left: 0,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    background: "#c0392b",
                    color: "#0a0a0a",
                    padding: "1px 6px",
                  }}
                >
                  [{i + 1}]
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pending annotation textarea */}
        {pendingBox && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <textarea
              value={pendingText}
              onChange={(e) => setPendingText(e.target.value)}
              placeholder="what would you change here?"
              rows={2}
              autoFocus
              style={{ ...T.field, resize: "none", fontSize: "13px" }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onAddAnnotation(); } }}
            />
            <Btn onClick={onAddAnnotation} disabled={!pendingText.trim()}>
              send feedback →
            </Btn>
          </div>
        )}

        {/* Annotation index */}
        {annotations.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>
            <div style={{ ...T.mono, fontSize: "10px" }}>
              {annotations.length} annotation{annotations.length > 1 ? "s" : ""} sent
            </div>
            {annotations.map((ann, i) => (
              <div
                key={ann.id}
                style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}
              >
                <AnnTag num={i + 1} />
                <span style={{ ...T.body, fontSize: "13px", color: "#9a9690" }}>
                  {ann.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── STATE: revised ────────────────────────────────────────────────
  if (state === "revised") {
    const img = revisedImage || generatedImage;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "500px" }}>
        <div style={{ ...T.mono, fontSize: "10px" }}>revised mockup</div>
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt="revised"
            style={{ width: "100%", border: "0.5px solid #1f1f1f" }}
          />
        )}
        <h3 style={{ ...T.display, fontSize: "22px" }}>does this work?</h3>
        <div style={{ display: "flex", gap: "12px" }}>
          <Btn onClick={onApprove}>approve ✓</Btn>
          <Btn onClick={onMoreFeedback}>more feedback →</Btn>
        </div>
      </div>
    );
  }

  // ── STATE: approved ───────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "500px" }}>
      <div style={{ ...T.mono, color: "#2ecc71" }}>● approved</div>
      <h2 style={{ ...T.display, fontSize: "30px" }}>commission complete.</h2>
      <p style={T.body}>Your files are ready to download.</p>
      <Btn onClick={() => {}}>download files →</Btn>
    </div>
  );
}

// ── Artist Panel ──────────────────────────────────────────────────────
interface ArtistPanelProps {
  state: PageState;
  brief: BriefData;
  artistPrompt: string;
  setArtistPrompt: (p: string) => void;
  onGenerate: () => void;
  generatingMockup: boolean;
  generatedImage: string | null;
  revisedImage: string | null;
  annotations: Annotation[];
  onApplyEdit: (ann: Annotation) => void;
  applyingEdit: boolean;
  activeEditAnnId: number | null;
  spinFrame: number;
  apiError: string | null;
  onUploadToCustomer: () => void;
  onRegenerate: () => void;
}

function ArtistPanel({
  state, brief, artistPrompt, setArtistPrompt,
  onGenerate, generatingMockup, generatedImage, revisedImage,
  annotations, onApplyEdit, applyingEdit, activeEditAnnId,
  spinFrame, apiError, onUploadToCustomer, onRegenerate,
}: ArtistPanelProps) {

  // ── STATE: brief ──────────────────────────────────────────────────
  if (state === "brief") {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.38,
          gap: "16px",
        }}
      >
        <pre
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "12px",
            color: "#6b6b6b",
            lineHeight: 1.65,
            textAlign: "center",
          }}
        >{`┌─────────────────┐
│  · · · · · · ·  │
│  awaiting brief │
│  · · · · · · ·  │
└─────────────────┘`}</pre>
        <div style={{ ...T.mono, color: "#4a4a4a", fontSize: "11px" }}>
          brief will appear here
        </div>
      </div>
    );
  }

  // ── STATE: generating ─────────────────────────────────────────────
  if (state === "generating") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div style={{ ...T.mono, fontSize: "10px" }}>brief received</div>
        <BriefCard brief={brief} />

        <div style={{ borderTop: "0.5px solid #1f1f1f", paddingTop: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ ...T.mono, fontSize: "10px" }}>generate initial mockup with reve</div>

          {!generatedImage && !generatingMockup && (
            <>
              <textarea
                value={artistPrompt}
                onChange={(e) => setArtistPrompt(e.target.value)}
                rows={4}
                style={{ ...T.field, resize: "none", lineHeight: 1.6, fontSize: "13px" }}
              />
              <Btn onClick={onGenerate} disabled={!artistPrompt.trim()}>
                generate with reve →
              </Btn>
            </>
          )}

          {generatingMockup && (
            <AsciiLoading spinFrame={spinFrame} label="generating" />
          )}

          {apiError && !generatingMockup && (
            <ErrorBox>{apiError}</ErrorBox>
          )}

          {generatedImage && !generatingMockup && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={generatedImage}
                alt="generated"
                style={{ width: "100%", border: "0.5px solid #1f1f1f" }}
              />
              <div style={{ display: "flex", gap: "12px" }}>
                <Btn onClick={onUploadToCustomer}>upload to customer →</Btn>
                <Btn onClick={onRegenerate}>regenerate</Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── STATE: feedback ───────────────────────────────────────────────
  if (state === "feedback") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div style={{ ...T.mono, fontSize: "10px" }}>mockup shared</div>

        {generatedImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={generatedImage}
            alt="shared mockup"
            style={{ width: "100%", border: "0.5px solid #1f1f1f", opacity: 0.65 }}
          />
        )}

        <div style={{ borderTop: "0.5px solid #1f1f1f", paddingTop: "16px" }}>
          <div style={{ ...T.mono, fontSize: "10px", marginBottom: "14px" }}>
            feedback thread
          </div>

          {annotations.length === 0 && (
            <div style={{ ...T.mono, color: "#4a4a4a", paddingTop: "4px" }}>
              awaiting client annotations ·  ·  ·
            </div>
          )}

          {annotations.map((ann, i) => (
            <div
              key={ann.id}
              style={{ ...T.card, marginBottom: "10px", display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <AnnTag num={i + 1} />
                <span style={{ ...T.body, fontSize: "13px", color: "#9a9690" }}>
                  {ann.text}
                </span>
              </div>

              {applyingEdit && activeEditAnnId === ann.id ? (
                <AsciiLoading spinFrame={spinFrame} label="applying edit" />
              ) : (
                <Btn
                  onClick={() => onApplyEdit(ann)}
                  disabled={applyingEdit}
                >
                  apply with reve →
                </Btn>
              )}
            </div>
          ))}

          {apiError && <ErrorBox>{apiError}</ErrorBox>}
        </div>
      </div>
    );
  }

  // ── STATE: revised ────────────────────────────────────────────────
  if (state === "revised") {
    const img = revisedImage || generatedImage;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ ...T.mono, color: "#9a9690" }}>● revision shared</div>
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt="revised"
            style={{ width: "100%", border: "0.5px solid #1f1f1f" }}
          />
        )}
      </div>
    );
  }

  // ── STATE: approved ───────────────────────────────────────────────
  const img = revisedImage || generatedImage;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ ...T.mono, color: "#2ecc71" }}>● client approved</div>
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt="approved"
          style={{ width: "100%", border: "0.5px solid #1f1f1f", opacity: 0.8 }}
        />
      )}
      <Btn onClick={() => {}}>download files →</Btn>
    </div>
  );
}

// ── Micro-components ──────────────────────────────────────────────────

function Btn({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...T.btn,
        background: hovered && !disabled ? "#f0ede8" : "transparent",
        color: hovered && !disabled ? "#0a0a0a" : "#f0ede8",
        opacity: disabled ? 0.3 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function BriefCard({ brief }: { brief: BriefData }) {
  return (
    <div style={{ ...T.card, display: "flex", flexDirection: "column", gap: "12px" }}>
      <p style={{ ...T.body, fontSize: "14px" }}>{brief.description}</p>
      {(brief.medium || brief.budget || brief.timeline) && (
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
          {brief.medium && <Meta label="medium" value={brief.medium} />}
          {brief.budget && <Meta label="budget" value={brief.budget} />}
          {brief.timeline && <Meta label="timeline" value={brief.timeline} />}
        </div>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ ...T.mono, fontSize: "10px", marginBottom: "2px" }}>{label}</div>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#9a9690" }}>
        {value}
      </div>
    </div>
  );
}

function AnnTag({ num }: { num: number }) {
  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "10px",
        border: "0.5px solid #c0392b",
        color: "#c0392b",
        padding: "1px 6px",
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
    >
      [{num}]
    </span>
  );
}

function AsciiLoading({ spinFrame, label }: { spinFrame: number; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 0" }}>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "18px",
          color: "#6b6b6b",
          width: "20px",
          display: "inline-block",
          textAlign: "center",
        }}
      >
        {SPINNER[spinFrame]}
      </span>
      <span style={{ ...T.mono, color: "#4a4a4a" }}>
        {label}  ·  ·  ·
      </span>
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        ...T.mono,
        color: "#c0392b",
        border: "0.5px solid #c0392b",
        padding: "10px 14px",
        fontSize: "11px",
      }}
    >
      {children}
    </div>
  );
}

function SelectionBox({ box, color, dim }: { box: DrawBox; color: string; dim?: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${box.x}%`,
        top: `${box.y}%`,
        width: `${box.w}%`,
        height: `${box.h}%`,
        border: `1px dashed ${color}`,
        background: dim ? `rgba(${color === "#e8e0d4" ? "232,224,212" : "192,57,43"},0.05)` : "transparent",
        pointerEvents: "none",
      }}
    />
  );
}

function Confetti() {
  const COLORS = ["#e8e0d4", "#c8c4be", "#2ecc71", "#f0ede8", "#9a9690", "#e8e0d4"];
  const pieces = Array.from({ length: 48 }, (_, i) => ({
    id: i,
    color: COLORS[i % COLORS.length],
    left: `${(i * 2.1) % 100}%`,
    delay: `${(i * 0.07) % 1.2}s`,
    dur: `${1.6 + (i % 5) * 0.3}s`,
    round: i % 3 !== 0,
    size: i % 4 === 0 ? "8px" : "5px",
  }));

  return (
    <>
      <style>{`
        @keyframes cfall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(540deg); opacity: 0; }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 999,
          overflow: "hidden",
        }}
      >
        {pieces.map((p) => (
          <div
            key={p.id}
            style={{
              position: "absolute",
              width: p.size,
              height: p.size,
              background: p.color,
              left: p.left,
              top: "-10px",
              borderRadius: p.round ? "50%" : "0",
              animation: `cfall ${p.dur} ease-in ${p.delay} forwards`,
            }}
          />
        ))}
      </div>
    </>
  );
}
