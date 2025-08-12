"use client";

import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";

export default function SignPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);

  const [wo, setWo] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // read ?wo= from URL once
  useEffect(() => {
    const u = new URL(window.location.href);
    const id = u.searchParams.get("wo") ?? "";
    if (id) setWo(id);
  }, []);

  // init signature pad + handle hi-DPI resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!padRef.current) {
      padRef.current = new SignaturePad(canvas, {
        minWidth: 0.8,
        maxWidth: 2.0,
      });
    }

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const { offsetWidth, offsetHeight } = canvas;
      canvas.width = Math.max(1, Math.floor(offsetWidth * ratio));
      canvas.height = Math.max(1, Math.floor(offsetHeight * ratio));
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(ratio, ratio);
      // keep the pad clean after resize
      padRef.current?.clear();
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  async function handleSubmit() {
    try {
      if (!wo) return alert("Enter a real Work Order # (or use ?wo= in the URL).");
      if (!consent) return alert("Please agree to the repair terms.");
      if (!padRef.current || padRef.current.isEmpty()) return alert("Please add a signature.");

      setSubmitting(true);

      // 1) Convert canvas → JPEG data URL
      const dataUrl = canvasRef.current!.toDataURL("image/jpeg", 0.9);

      // 2) Upload image to Vercel Blob (returns public URL)
      const fd = new FormData();
      fd.set("dataUrl", dataUrl);
      fd.set("workorderId", wo);
      fd.set("name", name || "Customer");

      const up = await fetch("/api/upload", { method: "POST", body: fd });
      if (!up.ok) throw new Error(await up.text());
      const { url } = (await up.json()) as { url: string };

      // 3) Try to add the link as a Work Order note in Lightspeed
      const noteResp = await fetch(`/api/workorders/${encodeURIComponent(wo)}/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, name }),
      });

      if (noteResp.ok) {
        alert("Signature saved ✔️ (link added to the Work Order note).");
      } else {
        // If LS blocks note edits, still copy the URL so the tech can paste it
        try {
          await navigator.clipboard.writeText(url);
        } catch {}
        const msg = await noteResp.text().catch(() => "");
        alert(
          `Signature saved ✔️\n\nCouldn’t auto-add a note (${noteResp.status}). The link is copied to your clipboard:\n\n${url}\n\nDetails: ${msg}`
        );
      }

      padRef.current.clear();
      setConsent(false);
    } catch (err: any) {
      console.error(err);
      alert("Upload failed: " + (err?.message ?? err));
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
          placeholder="129482"
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
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
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
        {submitting ? "Submitting..." : "Submit Signature"}
      </button>

      <p style={{ opacity: 0.6, marginTop: 10, fontSize: 12 }}>
        Tip: if you still see “WorkorderImage” in an error, your browser is using an old bundle —
        hard-refresh or open in a new incognito window.
      </p>
    </main>
  );
}
