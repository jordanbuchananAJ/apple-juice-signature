"use client";

import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";

export default function Sign() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [wo, setWo] = useState("");

  useEffect(() => {
    const u = new URL(window.location.href);
    setWo(u.searchParams.get("wo") ?? "");
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      c.width = c.offsetWidth * ratio;
      c.height = c.offsetHeight * ratio;
      const ctx = c.getContext("2d")!;
      ctx.scale(ratio, ratio);
      padRef.current?.clear();
    };
    if (!padRef.current) padRef.current = new SignaturePad(c, { minWidth: 1, maxWidth: 2 });
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  async function handleSubmit() {
    if (!wo) return alert("Add ?wo=123 to the URL or fill Work Order #");
    if (!consent) return alert("Please accept the terms.");
    if (padRef.current?.isEmpty()) return alert("Please sign.");

    const dataUrl = padRef.current!.toDataURL("image/png");
    const description = `Repair authorization signed by ${name || "Customer"} at ${new Date().toISOString()}`;

    const r = await fetch(`/api/workorders/${encodeURIComponent(wo)}/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl, description }),
    });
    if (!r.ok) return alert("Upload failed: " + (await r.text()));
    alert("Signature uploaded to work order.");
    padRef.current!.clear();
  }

  return (
    <main style={{ maxWidth: 680, margin: "40px auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <h1>Repair Authorization</h1>

      <label style={{ display: "block", marginBottom: 8 }}>
        Work Order #
        <input value={wo} onChange={(e) => setWo(e.target.value)} placeholder="12345"
          style={{ width: "100%", padding: 8, marginTop: 4, borderRadius: 8, border: "1px solid #ccc" }} />
      </label>

      <label style={{ display: "block", margin: "12px 0" }}>
        Your Name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Appleseed"
          style={{ width: "100%", padding: 8, marginTop: 4, borderRadius: 8, border: "1px solid #ccc" }} />
      </label>

      <div style={{ height: 220, border: "1px dashed #888", borderRadius: 12, background: "#fff", margin: "12px 0" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => padRef.current?.clear()} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #aaa", background: "#f7f7f7" }}>
          Clear
        </button>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          I agree to the repair terms.
        </label>
      </div>

      <button onClick={handleSubmit} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "#111", color: "#fff" }}>
        Submit Signature
      </button>
    </main>
  );
}
