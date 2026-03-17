import { useState } from "react";
import client from "../api/client";

export default function NlqSearchBar({ departmentId }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setAnswer("");

    try {
      const payload = { question: query };
      if (departmentId) payload.department = departmentId;
      
      const { data } = await client.post("/ai/search", payload);
      setAnswer(data.data?.answer || "No response generated.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate AI response.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-brand-ocean/30 bg-white/60 shadow-lg backdrop-blur-md transition-all hover:bg-white/80 hover:shadow-xl">
      <form onSubmit={handleSearch} className="flex items-center gap-3 p-2 px-3">
        <div className="flex flex-1 items-center gap-3 rounded-xl bg-white/70 px-4 py-3 shadow-inner ring-1 ring-brand-ink/5 focus-within:ring-2 focus-within:ring-brand-ocean/50">
          <svg className="h-5 w-5 text-brand-ocean/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask the IQAC Natural Language Analytics Engine (e.g., 'What is the average CGPA?')"
            className="w-full bg-transparent text-sm text-brand-ink outline-none border-none placeholder-brand-ink/40"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-ocean to-brand-ink px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
        >
          {loading ? "Analyzing Data..." : "Ask AI"}
          {!loading && (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )}
        </button>
      </form>
      
      {(answer || error) && (
        <div className="border-t border-brand-ocean/10 bg-gradient-to-br from-brand-ocean/5 to-transparent p-5">
          {error ? (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm">
              <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p>{error}</p>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-ocean to-brand-ink text-white shadow-md ring-4 ring-brand-ocean/10">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1 space-y-2 pt-1">
                <p className="text-sm font-semibold text-brand-ink">AI Analysis Answer</p>
                <p className="text-sm leading-relaxed text-brand-ink/80">{answer}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
