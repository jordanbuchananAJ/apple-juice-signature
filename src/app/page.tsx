export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <h1>Apple-Juice Signature</h1>
      <p>This app will capture repair signatures and attach them to Lightspeed R-Series work orders.</p>
      <p><a href="/api/oauth/start">Begin Lightspeed OAuth</a></p>
    </main>
  );
}
