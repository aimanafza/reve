"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Annotation, GarmentZone } from "@/lib/types";
import { detectZone, buildRevisionPrompt } from "@/lib/garmentZones";

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };
const sans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const zoneHints: Record<GarmentZone, string> = {
  neckline:  "e.g. lower V-neck, sweetheart, off-shoulder",
  shoulders: "e.g. structured, cold-shoulder, wider straps",
  bodice:    "e.g. more fitted, add princess seams, boning",
  sleeves:   "e.g. puff sleeves, bishop, no sleeves",
  waist:     "e.g. empire waist, add belt, drop the waist",
  skirt:     "e.g. fuller A-line, add frills, midi length",
  hem:       "e.g. scalloped edge, floor-length, raw hem",
  back:      "e.g. open back, keyhole, button placket",
  custom:    "describe what you'd like changed here",
};

const zoneDefaultPrompt: Record<GarmentZone, string> = {
  neckline:  "modify the neckline — [describe change]",
  shoulders: "adjust the shoulders — [describe change]",
  bodice:    "reshape the bodice — [describe change]",
  sleeves:   "redesign the sleeves — [describe change]",
  waist:     "adjust the waistline — [describe change]",
  skirt:     "adjust the skirt silhouette — [describe change]",
  hem:       "change the hem — [describe change]",
  back:      "adjust the back detail — [describe change]",
  custom:    "apply the edit — [describe change]",
};

interface ActiveClick {
  x: number;
  y: number;
  zone: GarmentZone;
  id: number;
  customerNote?: string;   // set when triggered from a customer feedback card
  initialPrompt: string;   // used by "clear" to reset textarea
}

export interface PrefillEdit {
  zone: GarmentZone;
  text: string;   // customer's raw feedback text
  nonce: number;
}

interface Props {
  imageUrl: string;
  mode: "designer" | "customer";
  annotations: Annotation[];
  onAnnotationAdd: (annotation: Annotation) => void;
  onAnnotationUpdate: (id: number, revisedUrl: string) => void;
  isReadOnly?: boolean;
  basePrompt?: string;
  prefillEdit?: PrefillEdit;
}

export function AnnotatableImage({
  imageUrl,
  mode,
  annotations,
  onAnnotationAdd,
  onAnnotationUpdate,
  isReadOnly = false,
  basePrompt = "",
  prefillEdit,
}: Props) {
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);
  const [cursorPos, setCursorPos]             = useState<{ x: number; y: number } | null>(null);
  const [active, setActive]                   = useState<ActiveClick | null>(null);
  const [editText, setEditText]               = useState("");
  const [applyState, setApplyState]           = useState<"idle" | "applying" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg]               = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef     = useRef<HTMLImageElement>(null);
  const panelRef     = useRef<HTMLDivElement>(null);

  // Sync image when parent swaps it
  useEffect(() => { setCurrentImageUrl(imageUrl); }, [imageUrl]);

  // "Address this →" — pre-populate panel from customer card
  useEffect(() => {
    if (!prefillEdit) return;
    const initial = buildRevisionPrompt(prefillEdit.zone, prefillEdit.text, basePrompt);
    setActive({
      x: 50, y: 40,
      zone: prefillEdit.zone,
      id: Date.now(),
      customerNote: prefillEdit.text,
      initialPrompt: initial,
    });
    setEditText(initial);
    setApplyState("idle");
    setErrorMsg("");
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
  }, [prefillEdit?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get click position as % of the rendered image element
  const getRelPos = useCallback((e: React.MouseEvent) => {
    const el = imageRef.current;
    if (!el) return { x: 50, y: 50 };
    const r = el.getBoundingClientRect();
    return {
      x: Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width)  * 100)),
      y: Math.min(100, Math.max(0, ((e.clientY - r.top)  / r.height) * 100)),
    };
  }, []);

  // Click on container — BUT only trigger if the img itself was the target or a child of it
  const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isReadOnly) return;
    const pos = getRelPos(e);
    const zone = detectZone({ x: pos.x - 5, y: pos.y - 5, width: 10, height: 10 });
    const initial = zoneDefaultPrompt[zone];
    setActive({ x: pos.x, y: pos.y, zone, id: Date.now(), initialPrompt: initial });
    setEditText(initial);
    setApplyState("idle");
    setErrorMsg("");
    // Scroll panel into view after it renders
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
  }, [isReadOnly, getRelPos]);

  const handleClose = () => {
    setActive(null);
    setEditText("");
    setApplyState("idle");
    setErrorMsg("");
  };

  // Customer mode: save text, no API
  const handleSave = () => {
    if (!active || !editText.trim()) return;
    onAnnotationAdd({
      id: active.id,
      rect: { x: active.x - 5, y: active.y - 5, width: 10, height: 10 },
      zone: active.zone,
      text: editText,
      status: "pending",
    });
    handleClose();
  };

  // Designer mode: generate a new image with the updated prompt
  const handleApply = async () => {
    if (!active || !editText.trim()) return;
    setApplyState("applying");
    try {
      const res = await fetch("/api/reve/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: editText }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const newUrl: string = data.imageUrl;
      setCurrentImageUrl(newUrl);
      onAnnotationAdd({
        id: active.id,
        rect: { x: active.x - 5, y: active.y - 5, width: 10, height: 10 },
        zone: active.zone,
        text: editText,
        revisedImageUrl: newUrl,
        status: "revised",
      });
      onAnnotationUpdate(active.id, newUrl);
      setApplyState("success");
      setTimeout(handleClose, 2000);
    } catch (err) {
      setApplyState("error");
      setErrorMsg(err instanceof Error ? err.message : "unknown error");
    }
  };

  const isDesigner = mode === "designer";
  const annotationColor = isDesigner ? "var(--text-primary)" : "var(--red)";
  const tagBg           = isDesigner ? "var(--text-primary)" : "var(--red)";

  // Selection box: 15% wide × 20% tall centred on click
  const BOX_W = 15;
  const BOX_H = 20;

  return (
    <div>
      {/* ── Image container (FIX 4: height cap) ── */}
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        onMouseMove={(e) => {
          if (isReadOnly || active) return;
          setCursorPos(getRelPos(e));
        }}
        onMouseLeave={() => setCursorPos(null)}
        style={{
          position: "relative",
          cursor: isReadOnly ? "default" : "crosshair",
          userSelect: "none",
          border: "0.5px solid var(--border)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={currentImageUrl}
          alt="garment"
          draggable={false}
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            pointerEvents: "none", // let container div handle all pointer events
          }}
        />

        {/* Cursor follower dot — hidden while panel is open */}
        {cursorPos && !isReadOnly && !active && (
          <div
            style={{
              position: "absolute",
              left: `${cursorPos.x}%`,
              top: `${cursorPos.y}%`,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--text-primary)",
              opacity: 0.45,
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        )}

        {/* Saved annotation overlays — pointer-events: none so they never block clicks */}
        {annotations.map((ann) => (
          <div
            key={ann.id}
            style={{
              position: "absolute",
              left: `${ann.rect.x}%`,
              top: `${ann.rect.y}%`,
              width: `${ann.rect.width}%`,
              height: `${ann.rect.height}%`,
              border: `1px dashed ${annotationColor}`,
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: -20,
                left: 0,
                background: tagBg,
                color: "white",
                ...mono,
                fontSize: 10,
                padding: "2px 6px",
                whiteSpace: "nowrap",
                pointerEvents: "none",
              }}
            >
              {ann.zone}{ann.revisedImageUrl ? " ✓" : ""}
            </span>
          </div>
        ))}

        {/* Active selection box — pulsing dashed, pointer-events: none */}
        {active && (
          <div
            style={{
              position: "absolute",
              left: `${Math.max(0, active.x - BOX_W / 2)}%`,
              top: `${Math.max(0, active.y - BOX_H / 2)}%`,
              width: `${BOX_W}%`,
              height: `${BOX_H}%`,
              border: "1.5px dashed var(--text-primary)",
              pointerEvents: "none",
              animation: "pulse-border 0.9s ease-in-out infinite",
            }}
          />
        )}
      </div>

      {/* ── Inline edit panel ── */}
      {active && (
        <div
          ref={panelRef}
          style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border)",
            borderTop: "none",
            padding: 20,
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ ...mono, fontSize: 10, color: isDesigner ? "var(--text-primary)" : "var(--red)" }}>
              {isDesigner ? `editing: [${active.zone}]` : `leave feedback on [${active.zone}]`}
            </span>
            <button
              onClick={handleClose}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 2px" }}
            >×</button>
          </div>

          {/* ── DESIGNER panel ── */}
          {isDesigner ? (
            <>
              {/* CUSTOMER SAID block — only when triggered from a customer note */}
              {active.customerNote && (
                <div
                  style={{
                    borderLeft: "2px solid var(--red)",
                    background: "var(--bg)",
                    padding: "10px 14px",
                    marginBottom: 16,
                  }}
                >
                  <p style={{ ...mono, fontSize: 10, color: "var(--red)", marginBottom: 6 }}>customer said</p>
                  <p style={{ ...sans, fontSize: 13, fontStyle: "italic", color: "var(--text-muted)", lineHeight: 1.5 }}>
                    &ldquo;{active.customerNote}&rdquo;
                  </p>
                </div>
              )}

              {/* YOUR REVE PROMPT label */}
              <label style={{ ...mono, fontSize: 10, color: "var(--text-muted)", display: "block", marginBottom: 8 }}>
                your reve prompt
              </label>

              <textarea
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                style={{
                  ...sans,
                  width: "100%",
                  minHeight: 100,
                  background: "white",
                  border: "0.5px solid var(--border)",
                  padding: "10px 14px",
                  fontSize: 14,
                  borderRadius: 2,
                  color: "var(--text-primary)",
                  outline: "none",
                  resize: "vertical",
                  lineHeight: 1.5,
                }}
              />

              <p style={{ ...sans, fontSize: 12, color: "var(--text-faint)", marginTop: 8, marginBottom: 12, lineHeight: 1.5 }}>
                reve will edit only this zone based on your prompt. be specific for best results.
              </p>

              {applyState === "error" && (
                <p style={{ ...mono, fontSize: 11, color: "var(--red)", marginBottom: 8 }}>{errorMsg}</p>
              )}

              {applyState === "applying" ? (
                <p style={{ ...mono, fontSize: 13, color: "var(--text-muted)", padding: "12px 0" }}>applying · · ·</p>
              ) : applyState === "success" ? (
                <p style={{ ...mono, fontSize: 13, color: "var(--green)", padding: "12px 0" }}>✓ applied</p>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={handleApply}
                    disabled={!editText.trim()}
                    style={{
                      ...sans,
                      flex: 1,
                      padding: "12px 16px",
                      background: "var(--text-primary)",
                      color: "var(--bg)",
                      border: "none",
                      fontSize: 13,
                      letterSpacing: "0.06em",
                      cursor: editText.trim() ? "pointer" : "not-allowed",
                      opacity: editText.trim() ? 1 : 0.5,
                      borderRadius: 0,
                    }}
                  >
                    apply with reve →
                  </button>
                  <button
                    onClick={() => setEditText(active.initialPrompt)}
                    style={{
                      ...sans,
                      padding: "12px 16px",
                      background: "transparent",
                      border: "none",
                      color: "var(--text-muted)",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    clear
                  </button>
                </div>
              )}
            </>
          ) : (
            /* ── CUSTOMER panel ── */
            <>
              <p style={{ ...sans, fontSize: 12, color: "var(--text-faint)", marginBottom: 12 }}>
                {zoneHints[active.zone]}
              </p>
              <textarea
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="describe what you'd like changed here..."
                style={{
                  ...sans,
                  width: "100%",
                  minHeight: 80,
                  background: "var(--bg)",
                  border: "0.5px solid var(--border)",
                  padding: "10px 14px",
                  fontSize: 14,
                  borderRadius: 2,
                  color: "var(--text-primary)",
                  outline: "none",
                  resize: "vertical",
                  lineHeight: 1.5,
                }}
              />
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={handleSave}
                  disabled={!editText.trim()}
                  style={{
                    ...sans,
                    width: "100%",
                    padding: "12px 16px",
                    background: "var(--text-primary)",
                    color: "var(--bg)",
                    border: "none",
                    fontSize: 13,
                    letterSpacing: "0.06em",
                    cursor: editText.trim() ? "pointer" : "not-allowed",
                    opacity: editText.trim() ? 1 : 0.5,
                    borderRadius: 0,
                  }}
                >
                  save feedback →
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
