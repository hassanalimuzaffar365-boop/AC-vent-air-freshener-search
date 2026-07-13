import { useState } from 'react';

/**
 * TEMPORARY test harness for Day 1 — just enough to confirm the
 * /api/search serverless function works end to end.
 * This gets replaced by the real results page UI later
 * (SRS Section 6, Feature 6 — its own commit: "Build results page UI").
 */
export default function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>Vent Freshener Search — Day 1 test harness</h1>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. lavender vent air freshener"
          style={{ flex: 1, padding: 8 }}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {results && (
        <pre style={{ background: '#f4f4f4', padding: 12, marginTop: 16, overflowX: 'auto' }}>
          {JSON.stringify(results, null, 2)}
        </pre>
      )}
    </div>
  );
}
