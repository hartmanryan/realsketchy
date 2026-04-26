export default function Home() {
  // Simple landing page – forward agents to the dashboard
  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-base)',
      color: 'var(--text-primary)',
      fontFamily: 'Inter, sans-serif',
    }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>AI Home Sketch</h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
        Capture leads with beautiful AI watercolor sketches.
      </p>
      <a
        href="/dashboard"
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: 'var(--accent-primary)',
          color: '#fff',
          borderRadius: '0.5rem',
          textDecoration: 'none',
          fontWeight: '600',
        }}
      >
        Go to Dashboard
      </a>
    </main>
  );
}
