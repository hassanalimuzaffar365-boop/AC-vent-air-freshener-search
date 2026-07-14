import { useState } from 'react';
import ProductCard from './components/ProductCard.jsx';
import './App.css';

export default function App() {
  const [query, setQuery] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Search failed');
      setData(result);
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <header className="header">
        <h1>Vent Freshener Search</h1>
        <p className="subtitle">Find car AC vent-mount air fresheners — checked by AI, not guesswork.</p>

        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. lavender vent air freshener"
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>
      </header>

      <main className="main">
        {loading && (
          <div className="status">
            <div className="spinner" />
            <p>Searching the web and checking results with AI…</p>
          </div>
        )}

        {!loading && error && (
          <div className="status status--error">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && hasSearched && data && data.results.length === 0 && (
          <div className="status">
            <p>No vent-mount air fresheners found for "{data.query}". Try a different search.</p>
          </div>
        )}

        {!loading && !error && data && data.results.length > 0 && (
          <>
            <p className="results-summary">
              {data.count} result{data.count !== 1 ? 's' : ''} for "{data.query}" —{' '}
              {data.source === 'live' ? (
                <span className="results-summary__live">fresh from the web</span>
              ) : (
                <span className="results-summary__saved">showing saved results</span>
              )}
            </p>
            <div className="grid">
              {data.results.map((product) => (
                <ProductCard key={product.id} product={product} source={data.source} />
              ))}
            </div>
          </>
        )}

        {!loading && !hasSearched && (
          <div className="status status--intro">
            <p>Search above to find real, AI-checked vent-mount air fresheners.</p>
          </div>
        )}
      </main>
    </div>
  );
}
