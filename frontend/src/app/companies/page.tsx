"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Company = { id: string; name: string; jurisdiction: string };

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/companies", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        setCompanies(await response.json() as Company[]);
      })
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Could not load companies.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <Link className="brand" href="/"><span className="brand-mark">O</span><span>Ownership<span className="brand-light">Graph</span></span></Link>
        <div className="side-section-label">WORKSPACE</div>
        <Link className="nav-item" href="/"><span className="nav-icon">⌘</span> Ownership graph</Link>
        <Link className="nav-item active" href="/companies"><span className="nav-icon">▤</span> Companies</Link>
        <div className="sidebar-bottom"><span className="avatar">CG</span><span><strong>Corporate group</strong><small>Analyst workspace</small></span><span className="more">···</span></div>
      </aside>
      <section className="main-column">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> Companies</div><div className="topbar-right"><span className={`status-dot${error ? " status-dot-error" : ""}`} /> {loading ? "Connecting to API" : error ? "API unavailable" : "API connected"}</div></header>
        <div className="content companies-content">
          <div className="page-heading"><div><div className="eyebrow">CORPORATE INTELLIGENCE</div><h1>Companies</h1><p>Browse the sample companies available in this workspace.</p></div></div>
          <section className="companies-panel">
            <div className="companies-panel-heading"><div><h2>Company directory</h2><p>{loading ? "Loading companies…" : `${companies.length} sample ${companies.length === 1 ? "company" : "companies"}`}</p></div><span className="directory-count">{loading ? "—" : companies.length}</span></div>
            {loading && <div className="directory-state"><span className="spinner" />Loading companies…</div>}
            {!loading && error && <div className="directory-state error-message"><strong>Unable to load companies</strong><span>{error}</span><button onClick={() => window.location.reload()}>Retry</button></div>}
            {!loading && !error && companies.length === 0 && <div className="directory-state">No companies are available.</div>}
            {!loading && !error && companies.length > 0 && <div className="company-table-wrap"><table className="company-table"><thead><tr><th>COMPANY</th><th>COMPANY ID</th><th>JURISDICTION</th><th></th></tr></thead><tbody>{companies.map((company) => <tr key={company.id}><td><span className="company-avatar">{company.name.slice(0, 1)}</span><strong>{company.name}</strong></td><td><code>{company.id}</code></td><td><span className="jurisdiction-tag">{company.jurisdiction}</span></td><td><Link className="table-action" href={`/?company=${encodeURIComponent(company.id)}`}>View graph <span>→</span></Link></td></tr>)}</tbody></table></div>}
          </section>
          <footer className="page-footer"><span>Corporate Ownership Graph</span><span>Sample company data is provided by the connected API</span></footer>
        </div>
      </section>
    </main>
  );
}
