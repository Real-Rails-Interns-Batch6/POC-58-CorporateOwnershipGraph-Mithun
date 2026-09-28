"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import  {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

type CompanyRecord = { id: string; name: string; jurisdiction: string };
type GraphResponse = {
  company_id: string;
  nodes: { id: string; company: CompanyRecord; node_type: string }[];
  edges: { source: string; target: string; ownership_percentage: number }[];
};
type CompanyNodeData = { company: CompanyRecord; isRoot: boolean };

function CompanyNode({ data }: NodeProps<Node<CompanyNodeData>>) {
  return (
    <article className={`company-node${data.isRoot ? " company-node-root" : ""}`}>
      <Handle type="target" position={Position.Top} />
      <span className="node-kicker">{data.isRoot ? "FOCAL COMPANY" : "ENTITY"}</span>
      <strong>{data.company.name}</strong>
      <span className="node-jurisdiction">{data.company.jurisdiction} · {data.company.id}</span>
      <Handle type="source" position={Position.Bottom} />
    </article>
  );
}

const nodeTypes = { company: CompanyNode };

export default function Home() {
  const [companyId, setCompanyId] = useState("sample-co-root");
  const [inputId, setInputId] = useState("sample-co-root");
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadGraph = useCallback(async (id: string, signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/companies/${encodeURIComponent(id)}/ownership-graph`, { signal });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      setGraph(await response.json() as GraphResponse);
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "Could not load ownership graph.");
      setGraph(null);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const requestedCompany = new URLSearchParams(window.location.search).get("company");
    if (requestedCompany) void Promise.resolve().then(() => {
      setCompanyId(requestedCompany);
      setInputId(requestedCompany);
    });
    const controller = new AbortController();
    void Promise.resolve().then(() => loadGraph(companyId, controller.signal));
    return () => controller.abort();
  }, [companyId, loadGraph]);

  const nodes = useMemo<Node<CompanyNodeData>[]>(() => {
    if (!graph) return [];
    const width = 280;
    const center = (graph.nodes.length - 1) / 2;
    return graph.nodes.map((item, index) => ({
      id: item.id,
      type: "company",
      position: { x: (index - center) * width, y: index === 0 ? 30 : 270 },
      data: { company: item.company, isRoot: item.id === graph.company_id },
    }));
  }, [graph]);

  const edges = useMemo<Edge[]>(() => graph?.edges.map((edge, index) => ({
    id: `${edge.source}-${edge.target}-${index}`,
    source: edge.source,
    target: edge.target,
    type: "smoothstep",
    animated: false,
    label: `${edge.ownership_percentage}%`,
    labelStyle: { fill: "#4f5d70", fontWeight: 700, fontSize: 12 },
    labelBgStyle: { fill: "#ffffff", fillOpacity: 0.95 },
    style: { stroke: "#a8b7c8", strokeWidth: 2 },
  })) ?? [], [graph]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = inputId.trim();
    if (normalized) setCompanyId(normalized);
  }

  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <Link className="brand" href="/"><span className="brand-mark">O</span><span>Ownership<span className="brand-light">Graph</span></span></Link>
        <div className="side-section-label">WORKSPACE</div>
        <Link className="nav-item active" href="/"><span className="nav-icon">⌘</span> Ownership graph</Link>
        <Link className="nav-item muted" href="/companies"><span className="nav-icon">▤</span> Companies</Link>
        <div className="sidebar-bottom"><span className="avatar">CG</span><span><strong>Corporate group</strong><small>Analyst workspace</small></span><span className="more">···</span></div>
      </aside>

      <section className="main-column">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> Ownership graph</div><div className="topbar-right"><span className={`status-dot${error ? " status-dot-error" : ""}`} /> {loading ? "Connecting to API" : error ? "API unavailable" : "API connected"} <span className="topbar-divider" /> <span className="help-mark">?</span></div></header>
        <div className="content">
          <div className="page-heading"><div><div className="eyebrow">CORPORATE INTELLIGENCE</div><h1>Ownership graph</h1><p>Explore the companies and relationships in a corporate structure.</p></div><form className="company-search" onSubmit={submit}><label htmlFor="company-id">Company ID</label><div><input id="company-id" value={inputId} onChange={(event) => setInputId(event.target.value)} placeholder="Enter a company ID" /><button type="submit">Load graph <span>→</span></button></div></form></div>

          <div className="stat-grid">
            <div className="stat-card"><span className="stat-label">ENTITIES IN VIEW</span><strong>{graph?.nodes.length ?? "—"}</strong><span className="stat-note">Companies in this structure</span></div>
            <div className="stat-card"><span className="stat-label">OWNERSHIP LINKS</span><strong>{graph?.edges.length ?? "—"}</strong><span className="stat-note">Direct relationships</span></div>
            <div className="stat-card"><span className="stat-label">ROOT JURISDICTION</span><strong className="stat-country">{graph?.nodes.find((node) => node.id === graph.company_id)?.company.jurisdiction ?? "—"}</strong><span className="stat-note">Registered location</span></div>
            <div className="stat-card"><span className="stat-label">GRAPH STATUS</span><strong className="stat-status"><span className="status-dot" />{loading ? "Loading" : error ? "Unavailable" : "Up to date"}</strong><span className="stat-note">Live data from ownership API</span></div>
          </div>

          <section className="graph-panel"><div className="panel-heading"><div><h2>Corporate structure</h2><p>Direct ownership relationships for <strong>{graph?.nodes.find((node) => node.id === graph.company_id)?.company.name ?? companyId}</strong></p></div><div className="legend"><span className="legend-line" /> Ownership <span className="legend-pill">Percentage</span></div></div>
            <div className="graph-canvas">
              {loading && <div className="graph-message"><span className="spinner" />Loading ownership data…</div>}
              {!loading && error && <div className="graph-message error-message"><strong>Unable to load this graph</strong><span>{error}</span><button onClick={() => void loadGraph(companyId)}>Retry</button></div>}
              {!loading && !error && graph && graph.nodes.length === 0 && <div className="graph-message">No companies were found for this ID.</div>}
              {!loading && !error && graph && graph.nodes.length > 0 && <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.24 }} minZoom={0.35} maxZoom={1.5} proOptions={{ hideAttribution: true }}><Background color="#e9eef4" gap={24} size={1} /><Controls position="bottom-right" showInteractive={false} /></ReactFlow>}
            </div>
            <div className="panel-footer"><span><span className="footer-dot" /> Showing direct ownership only</span><span>{graph ? `Company ID: ${graph.company_id}` : "Ownership data"}</span></div>
          </section>
          <footer className="page-footer"><span>Corporate Ownership Graph</span><span>Structure data is provided by your connected API</span></footer>
        </div>
      </section>
    </main>
  );
}
