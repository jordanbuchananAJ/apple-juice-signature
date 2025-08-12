"use client";

import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";

export default function SignPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);

  const [wo, setWo] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [consent, setConsent] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);

  // Pull ?wo=123 from the URL on first render
  useEffect(() => {
    const u = new URL(window.location.href);
    const id = u.searchParams.get("wo") ?? "";
    if (id) setWo(id);
  }, []);

  // Initialize and keep the canvas crisp on hi-DPI screens
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!padRef.current) {
      padRef.current = new SignaturePad(canvas, { minWidth: 0.8, maxWidth: 2 });
    }

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const { offsetWidth, offsetHeight } = canvas;
      canvas.width = Math.max(1, Math.floor(offsetWidth * ratio));
      canvas.height = Math.max(1, Math.floor(offsetHeight * ratio));
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(ratio, ratio);
      padRef.current?.clear();
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  async function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    // Safari sometimes returns null from toBlob; provide a robust fallback.
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9)
    );
    if (blob) return blob;

    // Fallback: dataURL → Blob
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const res = await fetch(dataUrl);
    return await res.blob();
  }

  async function handleSubmit() {
    try {
      if (!wo) return alert("Add ?wo=WORKORDER_ID to the URL or enter the Work Order #.");
      if (!consent) return alert("Please accept the terms.");
      if (!padRef.current || padRef.current.isEmpty()) return alert("Please add a signature.");

      setSubmitting(true);

      // 1) Get a JPEG blob from the canvas
      const canvas = canvasRef.current!;
      const blob = await canvasToJpegBlob(canvas);

      // 2) Build multipart/form-data (do NOT set Content-Type; browser will add boundary)
      const fd = new FormData();
      fd.set("image", new File([blob], `wo-${wo}-signature.jpg`, { type: "image/jpeg" }));

      // 3) POST to our API route
      const resp = await fetch(`/api/workorders/${encodeURIComponent(wo)}/image`, {
        method: "POST",
        body: fd,
      });

      const text = await resp.text();
      if (!resp.ok) {
        alert("Upload failed: " + text);
        return;
      }

      alert("Signature uploaded to work order.");
      padRef.current.clear();
    } catch (err: unknown) {
      console.error(err);
      alert("Something went wrong submitting the signature.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "40px auto",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        color: "#eaeaea",
      }}
    >
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 6, color: "#eaeaea" }}>
        Repair Authorization
      </h1>

      <label style={{ display: "block", marginBottom: 10 }}>
        <div style={{ opacity: 0.8, marginBottom: 6 }}>Work Order #</div>
        <input
          value={wo}
          onChange={(e) => setWo(e.target.value)}
          placeholder="12345"
          inputMode="numeric"
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 12,
            border: "1px solid #3a3a3a",
            background: "#1c1c1c",
            color: "#eaeaea",
          }}
        />
      </label>

      <label style={{ display: "block", marginBottom: 10 }}>
        <div style={{ opacity: 0.8, marginBottom: 6 }}>Your Name</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jordan Buchanan"
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 12,
            border: "1px solid #3a3a3a",
            background: "#1c1c1c",
            color: "#eaeaea",
          }}
        />
      </label>

      <div
        style={{
          height: 260,
          border: "1px dashed #888",
          borderRadius: 14,
          background: "#fff",
          margin: "14px 0",
          overflow: "hidden",
        }}
      >
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => padRef.current?.clear()}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #3a3a3a",
            background: "#2a2a2a",
            color: "#eaeaea",
          }}
        >
          Clear
        </button>

        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>I agree to the repair terms.</span>
        </label>
      </div>

      <button
        type="button"
        disabled={submitting}
        onClick={handleSubmit}
        style={{
          padding: "12px 16px",
          borderRadius: 12,
          border: "none",
          background: submitting ? "#555" : "#111",
          color: "#fff",
          cursor: submitting ? "not-allowed" : "pointer",
        }}
      >
        {submitting ? "Submitting…" : "Submit Signature"}
      </button>
    </main>
  );
}
