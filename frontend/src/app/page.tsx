"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ReactFlow, Background, Controls, Handle, Position, type Edge, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

type Company = { id: string; name: string; jurisdiction: string };
type Graph = { company_id: string; nodes: { id: string; company: Company; node_type: string }[]; edges: { source: string; target: string; ownership_percentage: number }[] };
type NodeData = { company: Company; isRoot: boolean; matchesJurisdiction: boolean };

function CompanyNode({ data }: NodeProps<Node<NodeData>>) {
  return <article className={`company-node${data.isRoot ? " company-node-root" : ""}`} title={`${data.company.name} · ${data.company.jurisdiction} · ${data.company.id}`}><Handle type="target" position={Position.Top} /><span className="node-kicker">{data.matchesJurisdiction ? `MATCH · ${data.company.jurisdiction}` : data.isRoot ? "FOCAL COMPANY" : "ENTITY"}</span><strong>{data.company.name}</strong><span className="node-jurisdiction">{data.company.jurisdiction} · {data.company.id}</span><Handle type="source" position={Position.Bottom} /></article>;
}
const nodeTypes = { company: CompanyNode };

export default function Home() {
  const [companyId, setCompanyId] = useState("sample-co-root");
  const [inputId, setInputId] = useState("sample-co-root");
  const [graph, setGraph] = useState<Graph | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [jurisdiction, setJurisdiction] = useState("All jurisdictions");
  const [minimumStake, setMinimumStake] = useState("0");

  const loadGraph = useCallback(async (id: string, signal?: AbortSignal) => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/companies/${encodeURIComponent(id)}/ownership-graph`, { signal });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      setGraph(await response.json() as Graph);
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "Could not load ownership graph."); setGraph(null);
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/companies", { signal: controller.signal }).then(async (response) => { if (response.ok) setCompanies(await response.json() as Company[]); }).catch(() => undefined);
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const requestedCompany = new URLSearchParams(window.location.search).get("company");
    if (!requestedCompany) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setCompanyId(requestedCompany);
      setInputId(requestedCompany);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const controller = new AbortController(); void Promise.resolve().then(() => loadGraph(companyId, controller.signal));
    return () => controller.abort();
  }, [companyId, loadGraph]);

  const filtered = useMemo(() => {
    if (!graph) return null;
    const allJurisdictions = jurisdiction === "All jurisdictions";
    const matching = new Set(graph.nodes.filter((node) => allJurisdictions || node.company.jurisdiction === jurisdiction).map((node) => node.id));
    const edges = graph.edges.filter((edge) => edge.source !== edge.target && edge.ownership_percentage >= Number(minimumStake) && (allJurisdictions || matching.has(edge.source) || matching.has(edge.target)));
    const included = allJurisdictions
      ? new Set([graph.company_id, ...edges.flatMap((edge) => [edge.source, edge.target])])
      : new Set([...matching, ...edges.flatMap((edge) => [edge.source, edge.target])]);
    const uniqueNodes = new Map(graph.nodes.filter((node) => included.has(node.id)).map((node) => [node.id, node]));
    return { ...graph, nodes: [...uniqueNodes.values()], edges };
  }, [graph, jurisdiction, minimumStake]);
  const flowNodes = useMemo<Node<NodeData>[]>(() => {
    if (!filtered) return [];
    const center = (filtered.nodes.length - 1) / 2;
    return filtered.nodes.map((item, index) => ({ id: item.id, type: "company", position: { x: (index - center) * 280, y: index === 0 ? 30 : 270 }, data: { company: item.company, isRoot: item.id === filtered.company_id, matchesJurisdiction: jurisdiction !== "All jurisdictions" && item.company.jurisdiction === jurisdiction } }));
  }, [filtered, jurisdiction]);
  const edges = useMemo<Edge[]>(() => filtered?.edges.map((edge, index) => ({ id: `${edge.source}-${edge.target}-${index}`, source: edge.source, target: edge.target, type: "smoothstep", label: `${edge.ownership_percentage}%`, ariaLabel: `${edge.ownership_percentage}% ownership from ${edge.source} to ${edge.target}`, labelStyle: { fill: "#d8e3f0", fontWeight: 700, fontSize: 12 }, labelBgStyle: { fill: "#111b29", fillOpacity: 1 }, style: { stroke: "#6285aa", strokeWidth: 2 } })) ?? [], [filtered]);

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const id = inputId.trim(); if (id) setCompanyId(companies.find((item) => item.id === id || item.name.toLowerCase() === id.toLowerCase())?.id ?? id); }
  function download(filename: string, content: string) {
    const url = URL.createObjectURL(new Blob([content], { type: "application/json" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
  }
  function downloadSnapshot() { if (filtered) download(`${companyId}-ownership-graph.json`, JSON.stringify({ ...filtered, data_status: "Sample/reference data; not live", intended_sources: ["OpenCorporates", "SEC EDGAR"] }, null, 2)); }

  return <main className="dashboard-shell">
    <aside className="sidebar"><Link className="brand" href="/"><span className="brand-mark">O</span><span>Ownership<span className="brand-light">Graph</span></span></Link><div className="side-section-label">WORKSPACE</div><Link className="nav-item active" href="/">◈ Ownership graph</Link><Link className="nav-item muted" href="/companies">▤ Companies</Link><div className="sidebar-bottom"><span className="avatar">CG</span><span><strong>Corporate group</strong><small>Analyst workspace</small></span><span className="more">···</span></div></aside>
    <section className="main-column"><header className="topbar"><div className="breadcrumb">Workspace <span>/</span> Ownership graph</div><div className="topbar-right"><span className={`status-dot${loading ? " status-dot-loading" : error ? " status-dot-error" : ""}`} />{loading ? "Connecting to API" : error ? "API unavailable" : "API connected"}<span className="topbar-divider" /><span className="help-mark" title="Sample data is served by the connected FastAPI demo">?</span></div></header>
      <div className="content">
        <div className="rail-banner"><span className="rail-icon">◎</span><span><small>REAL RAILS INTELLIGENCE LIBRARY · CORE RAIL</small><strong>Governance &amp; Trust</strong></span><span className="sample-badge">SAMPLE / REFERENCE DATA · NOT LIVE</span></div>
        <div className="page-heading"><div><div className="eyebrow">CORPORATE INTELLIGENCE</div><h1>Corporate Ownership Graph</h1><p>Explore the companies and relationships in a corporate structure.</p></div><form className="company-search" onSubmit={submit}><label htmlFor="company-id">Search company or entity</label><div><input id="company-id" list="company-suggestions" value={inputId} onChange={(event) => setInputId(event.target.value)} placeholder="Name or company ID" /><datalist id="company-suggestions">{companies.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.jurisdiction}</option>)}</datalist><button type="submit">Load graph <span>→</span></button></div></form></div>
        <div className="stat-grid"><div className="stat-card"><span className="stat-label">ENTITIES IN VIEW</span><strong>{filtered ? flowNodes.length : "—"}</strong><span className="stat-note">Companies in this structure</span></div><div className="stat-card"><span className="stat-label">OWNERSHIP LINKS</span><strong>{filtered?.edges.length ?? "—"}</strong><span className="stat-note">Direct relationships</span></div><div className="stat-card"><span className="stat-label">ROOT JURISDICTION</span><strong className="stat-country">{graph?.nodes.find((node) => node.id === graph.company_id)?.company.jurisdiction ?? "—"}</strong><span className="stat-note">Registered location</span></div><div className="stat-card"><span className="stat-label">GRAPH STATUS</span><strong className="stat-status"><span className={`status-dot${loading ? " status-dot-loading" : error ? " status-dot-error" : ""}`} />{loading ? "Loading" : error ? "Unavailable" : "API connected"}</strong><span className="stat-note">Sample data served by connected API</span></div></div>
        <section className="graph-panel"><div className="panel-heading"><div><h2>Corporate structure</h2><p>Direct ownership relationships for <strong>{graph?.nodes.find((node) => node.id === graph.company_id)?.company.name ?? companyId}</strong></p></div><div className="graph-actions"><button className="download-button" onClick={downloadSnapshot} disabled={!filtered}>Download graph snapshot</button><button className="download-button secondary" onClick={() => download("corporate-ownership-sample-data.json", JSON.stringify({ companies, graph: graph ?? null, data_status: "Sample/reference data; not live", intended_sources: ["OpenCorporates", "SEC EDGAR"] }, null, 2))}>Download sample data</button></div><div className="legend"><span className="legend-line" /> Ownership <span className="legend-pill">Percentage</span></div></div>
          <div className="filter-row"><label>Jurisdiction<select value={jurisdiction} onChange={(event) => setJurisdiction(event.target.value)}><option>All jurisdictions</option>{Array.from(new Set(graph?.nodes.map((node) => node.company.jurisdiction) ?? [])).sort().map((code) => <option key={code}>{code}</option>)}</select></label><label>Ownership layer<select value="Direct ownership" disabled title="The API returns direct relationships only"><option>Direct ownership</option></select></label><label>Minimum ownership stake<select value={minimumStake} onChange={(event) => setMinimumStake(event.target.value)}><option value="0">Any stake</option><option value="25">25% and above</option><option value="50">50% and above</option><option value="75">75% and above</option></select></label><span className="layer-note">API currently provides direct relationships only</span></div>
          <div className="graph-canvas">{loading && <div className="graph-message"><span className="spinner" />Loading ownership data…</div>}{!loading && error && <div className="graph-message error-message"><strong>Unable to load this graph</strong><span>{error}</span><button onClick={() => void loadGraph(companyId)}>Retry</button></div>}{!loading && !error && graph && flowNodes.length === 0 && <div className="graph-message">No entities match these filters.</div>}{!loading && !error && graph && flowNodes.length > 0 && <ReactFlow nodes={flowNodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.24 }} minZoom={0.35} maxZoom={1.5} proOptions={{ hideAttribution: true }}><Background color="#26364a" gap={24} size={1} /><Controls position="bottom-right" showInteractive={false} /></ReactFlow>}</div>
          <div className="panel-footer"><span><span className="footer-dot" /> Showing direct ownership only</span><span>{graph ? `Company ID: ${graph.company_id}` : "Ownership data"}</span></div>
        </section>
        <section className="source-panel"><div><h2>Data sources &amp; coverage</h2><p><strong>OpenCorporates</strong> and <strong>SEC EDGAR</strong> are intended public registry and filing sources for this rail.</p></div><span>Current graph and directory are illustrative sample/reference records served by FastAPI. They are not live registry or filing data.</span></section>
        <section className="insight-grid" aria-label="Ownership insights"><article className="insight-card"><span className="insight-icon">i</span><div><h2>Why this matters</h2><p>Ownership links show how companies connect, helping you trace structure and understand relationships across the group.</p></div></article><article className="insight-card control-card"><span className="insight-icon">↳</span><div><h2>Who controls the rail</h2><p>{graph?.edges.length ? `Review the ${graph.edges.length} direct ownership ${graph.edges.length === 1 ? "link" : "links"} shown above. Percentages indicate recorded stakes; this view covers direct relationships only.` : "Load a company graph to review direct ownership links and recorded stakes across its structure."}</p></div></article></section>
        <footer className="page-footer"><span>Corporate Ownership Graph</span><span>Sample/reference data from connected API · not live</span></footer>
      </div>
    </section>
  </main>;
}
