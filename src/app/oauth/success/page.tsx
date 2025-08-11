export default function Page() {
  return (
    <main style={{ padding: 24 }}>
      <h1>OAuth Connected ✅</h1>
      <p>We’ve got a token. Try the test call:</p>
      <p><a href="/api/ls/test">GET /API/Account</a></p>
    </main>
  );
}
