import { useState, useRef, useEffect, useCallback } from "react";
import { useDeploy } from "./hooks/useDeploy.js";

// ─── Config ───────────────────────────────────────────────────────────────────
const GITHUB_URL  = import.meta.env.VITE_GITHUB_URL      ?? "https://github.com/Z0nure/MC-Addon-Deployer";
const PYTHON_REPO = import.meta.env.VITE_PYTHON_REPO_URL ?? "https://github.com/Z0nure/mcaddon-cli";
const KOFI_URL    = import.meta.env.VITE_KOFI_URL        ?? "https://ko-fi.com/zonure";
const AUTHOR      = import.meta.env.VITE_AUTHOR          ?? "Zonure";
const AUTHOR_URL  = import.meta.env.VITE_AUTHOR_URL      ?? "https://zonure.xyz";
const SITE_NAME   = import.meta.env.VITE_SITE_NAME       ?? "mc-addon-deployer";

// ─── Icons ────────────────────────────────────────────────────────────────────
const GitHubIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const XIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ─── Nav ──────────────────────────────────────────────────────────────────────
const TABS = ["deploy", "guide", "privacy"];

function Nav({ activeTab, setActiveTab }) {
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const handleTab = (tab) => {
    setActiveTab(tab);
    setMenuOpen(false);
    window.history.pushState(null, "", `#${tab}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      borderBottom: `1px solid ${scrolled || menuOpen ? "var(--border)" : "transparent"}`,
      background: scrolled || menuOpen ? "rgba(8,8,9,0.96)" : "transparent",
      backdropFilter: scrolled || menuOpen ? "blur(12px)" : "none",
      transition: "background 0.2s, border-color 0.2s",
    }}>
      <div style={{ height: "var(--nav-h)", display: "flex", alignItems: "center", padding: "0 24px" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          <button onClick={() => handleTab("deploy")} style={{
            background: "none", border: "none", cursor: "pointer", padding: 0,
            fontFamily: "var(--mono)", fontWeight: 700, fontSize: 13,
            color: "var(--accent)", letterSpacing: "-0.02em",
          }}>{SITE_NAME}</button>
          <span style={{
            fontSize: 10, fontFamily: "var(--mono)", color: "var(--muted)",
            background: "var(--surface-2)", border: "1px solid var(--border-hi)",
            padding: "1px 6px", borderRadius: 3, flexShrink: 0,
          }}>v1.0</span>
          <span className="nav-by" style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)" }}>
            by <a href={AUTHOR_URL} target="_blank" rel="noopener noreferrer"
              style={{ color: "var(--muted)", transition: "color 0.15s" }}
              onMouseEnter={e => e.target.style.color = "var(--accent)"}
              onMouseLeave={e => e.target.style.color = "var(--muted)"}
            >{AUTHOR}</a>
          </span>
        </div>

        {/* Desktop tabs */}
        <div className="nav-desktop" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => handleTab(tab)} style={{
              background: activeTab === tab ? "var(--accent-glow)" : "transparent",
              border: "none", cursor: "pointer",
              padding: "6px 14px", borderRadius: 6,
              fontSize: 13, fontWeight: 600, fontFamily: "var(--sans)",
              color: activeTab === tab ? "var(--accent)" : "var(--text-2)",
              transition: "all 0.15s", textTransform: "capitalize",
            }}
            onMouseEnter={e => { if (activeTab !== tab) e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={e => { if (activeTab !== tab) e.currentTarget.style.color = "var(--text-2)"; }}
            >{tab}</button>
          ))}
          <div style={{ width: 1, height: 20, background: "var(--border-hi)", margin: "0 8px" }} />
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" style={{
            display: "flex", alignItems: "center", gap: 6,
            color: "var(--text-2)", fontSize: 13, fontWeight: 600,
            padding: "6px 12px", border: "1px solid var(--border-hi)", borderRadius: 6,
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-hi)"; e.currentTarget.style.color = "var(--text-2)"; }}
          ><GitHubIcon /> GitHub</a>
        </div>

        {/* Hamburger */}
        <button className="nav-hamburger" onClick={() => setMenuOpen(o => !o)}
          style={{ display: "none", background: "none", border: "none", cursor: "pointer", padding: 8, flexDirection: "column", gap: 5, alignItems: "center", justifyContent: "center" }}>
          <span style={{ display: "block", width: 22, height: 2, background: "var(--text)", borderRadius: 2, transition: "transform 0.2s", transform: menuOpen ? "translateY(7px) rotate(45deg)" : "none" }} />
          <span style={{ display: "block", width: 22, height: 2, background: "var(--text)", borderRadius: 2, transition: "opacity 0.2s", opacity: menuOpen ? 0 : 1 }} />
          <span style={{ display: "block", width: 22, height: 2, background: "var(--text)", borderRadius: 2, transition: "transform 0.2s", transform: menuOpen ? "translateY(-7px) rotate(-45deg)" : "none" }} />
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "8px 24px 20px", display: "flex", flexDirection: "column" }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => handleTab(tab)} style={{
              background: "none", border: "none", borderBottom: "1px solid var(--border)",
              cursor: "pointer", padding: "14px 0", textAlign: "left",
              fontSize: 15, fontWeight: 600, fontFamily: "var(--sans)",
              color: activeTab === tab ? "var(--accent)" : "var(--text-2)",
              textTransform: "capitalize",
            }}>{tab}</button>
          ))}
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: "var(--text-2)", fontWeight: 600, padding: "14px 0" }}>
            <GitHubIcon /> GitHub
          </a>
        </div>
      )}
    </nav>
  );
}

// ─── Deploy tab ───────────────────────────────────────────────────────────────
function Field({ label, type = "text", value, onChange, placeholder, hint }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: "var(--muted)", textTransform: "uppercase", fontFamily: "var(--mono)" }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ background: "var(--bg)", border: `1px solid ${focused ? "var(--accent)" : "var(--border-hi)"}`, borderRadius: 6, padding: "10px 14px", color: "var(--text)", fontFamily: "var(--mono)", fontSize: 13, outline: "none", transition: "border-color 0.15s" }} />
      {hint && <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>{hint}</span>}
    </div>
  );
}

function DropZone({ onFiles }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handle = useCallback((incoming) => {
    const valid = Array.from(incoming).filter(f => {
      const ext = f.name.split(".").pop().toLowerCase();
      return ["mcaddon", "mcpack"].includes(ext);
    });
    if (valid.length) onFiles(valid);
  }, [onFiles]);

  const onDrop = (e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files); };

  return (
    <div
      onClick={() => inputRef.current.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      style={{
        border: `2px dashed ${dragging ? "var(--accent)" : "var(--border-hi)"}`,
        borderRadius: 8, padding: "28px 24px", textAlign: "center", cursor: "pointer",
        background: dragging ? "var(--accent-glow)" : "transparent", transition: "all 0.15s",
      }}
    >
      <input ref={inputRef} type="file" accept=".mcaddon,.mcpack" multiple style={{ display: "none" }}
        onChange={e => { handle(e.target.files); e.target.value = ""; }} />
      <div style={{ fontSize: 28, marginBottom: 8 }}>⬆️</div>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Drop addon files here</div>
      <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)" }}>.mcaddon · .mcpack · multiple files supported</div>
    </div>
  );
}

const STATUS_STYLE = {
  install: { color: "var(--accent)",  bg: "rgba(0,229,160,0.08)",  border: "var(--accent-dim)", label: "Ready" },
  update:  { color: "#7eb8ff",        bg: "rgba(126,184,255,0.08)", border: "rgba(126,184,255,0.3)", label: "Update" },
  skip:    { color: "var(--warn)",    bg: "rgba(245,166,35,0.08)", border: "rgba(245,166,35,0.3)", label: "Skip" },
  error:   { color: "var(--error)",   bg: "rgba(255,77,109,0.08)", border: "rgba(255,77,109,0.3)", label: "Error" },
  pending: { color: "var(--muted)",   bg: "transparent",           border: "var(--border-hi)",    label: "Queued" },
  done:    { color: "var(--accent)",  bg: "rgba(0,229,160,0.08)",  border: "var(--accent-dim)",   label: "Done" },
};

function QueueItem({ file, result, onRemove, deploying }) {
  const st = result ? STATUS_STYLE[result.status] ?? STATUS_STYLE.pending : STATUS_STYLE.pending;
  const label = result ? (STATUS_STYLE[result.status]?.label ?? result.status) : "Queued";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 14px", borderRadius: 8,
      background: st.bg, border: `1px solid ${st.border}`,
      transition: "all 0.2s",
    }}>
      <div style={{ fontSize: 18, flexShrink: 0 }}>📦</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {file.name}
        </div>
        {result?.reason && (
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{result.reason}</div>
        )}
        {result?.error && (
          <div style={{ fontSize: 11, color: "var(--error)", marginTop: 2 }}>{result.error}</div>
        )}
      </div>
      <div style={{
        fontSize: 11, fontFamily: "var(--mono)", fontWeight: 700,
        color: st.color, padding: "2px 8px", borderRadius: 4,
        background: st.bg, border: `1px solid ${st.border}`,
        flexShrink: 0, letterSpacing: "0.05em",
      }}>{label}</div>
      {!deploying && !result && (
        <button onClick={() => onRemove(file)} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--muted)", padding: 4, display: "flex", flexShrink: 0,
          transition: "color 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.color = "var(--error)"}
        onMouseLeave={e => e.currentTarget.style.color = "var(--muted)"}
        ><XIcon /></button>
      )}
    </div>
  );
}

function LogLine({ message, type }) {
  const colors = { success: "var(--accent)", error: "var(--error)", warn: "var(--warn)", info: "var(--text)" };
  return <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: colors[type] ?? "var(--text)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{message}</div>;
}

function DeployTab() {
  const [queue, setQueue]       = useState([]); // File[]
  const [panelUrl, setPanelUrl] = useState("");
  const [apiKey, setApiKey]     = useState("");
  const [serverId, setServerId] = useState("");
  const [worldPath, setWorldPath] = useState("worlds/default");
  const [restart, setRestart]   = useState(false);
  const { logs, status, results, deploy, reset } = useDeploy();
  const logsEndRef = useRef();

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  const addFiles = (incoming) => {
    setQueue(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...incoming.filter(f => !names.has(f.name))];
    });
  };

  const removeFile = (file) => setQueue(prev => prev.filter(f => f !== file));

  // Map results back to files by filename
  const resultMap = {};
  if (results) {
    for (const r of results) {
      // match by pack name — best effort
      const match = queue.find(f => f.name.replace(/\.(mcaddon|mcpack)$/i, "").replace(/\s+/g, "_") === r.name || f.name === r.name);
      if (match) resultMap[match.name] = r;
    }
  }

  const canDeploy = queue.length > 0 && panelUrl && apiKey && serverId && status !== "deploying";

  const handleDeploy = () => {
    if (!canDeploy) return;
    deploy({ files: queue, panelUrl, apiKey, serverId, worldPath, restart });
  };

  const handleReset = () => { reset(); setQueue([]); };

  const installed  = results?.filter(r => r.status === "install").length ?? 0;
  const updated    = results?.filter(r => r.status === "update").length ?? 0;
  const skipped    = results?.filter(r => r.status === "skip").length ?? 0;
  const failed     = results?.filter(r => r.status === "error").length ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--accent)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>Deploy Tool</div>
        <h1 style={{ fontSize: "clamp(24px, 4vw, 38px)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>Deploy your addons</h1>
        <p style={{ marginTop: 8, color: "var(--text-2)", fontSize: 14, lineHeight: 1.6 }}>
          Upload one or more <code>.mcaddon</code> or <code>.mcpack</code> files and deploy them straight to your Pelican or Pterodactyl server.
        </p>
      </div>

      {/* Drop zone */}
      <DropZone onFiles={addFiles} />

      {/* Queue */}
      {queue.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Queue · {queue.length} file{queue.length !== 1 ? "s" : ""}
          </div>
          {queue.map(file => (
            <QueueItem key={file.name} file={file}
              result={results ? (resultMap[file.name] ?? { status: "done" }) : null}
              onRemove={removeFile} deploying={status === "deploying"} />
          ))}
        </div>
      )}

      {/* Panel config */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Panel Config</div>
        <div className="deploy-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <Field label="Panel URL" value={panelUrl} onChange={setPanelUrl} placeholder="https://panel.example.com" />
          <Field label="Server ID" value={serverId} onChange={setServerId} placeholder="a1b2c3d4" />
        </div>
        <Field label="API Key" type="password" value={apiKey} onChange={setApiKey}
          placeholder="pacc_… or ptlc_…"
          hint="Client API key — Account → API Credentials in your panel" />
        <Field label="World Path" value={worldPath} onChange={setWorldPath}
          placeholder="worlds/default"
          hint="Relative to your container root, as seen in the panel file manager" />
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "var(--text-2)", userSelect: "none" }}>
          <input type="checkbox" checked={restart} onChange={e => setRestart(e.target.checked)} style={{ accentColor: "var(--accent)", width: 15, height: 15 }} />
          Restart server after deploying
        </label>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={handleDeploy} disabled={!canDeploy} style={{
          flex: 1, padding: "13px 24px",
          background: canDeploy ? "var(--accent)" : "var(--border)",
          color: canDeploy ? "#000" : "var(--muted)",
          border: "none", borderRadius: 8, fontFamily: "var(--sans)", fontWeight: 700, fontSize: 14,
          cursor: canDeploy ? "pointer" : "not-allowed", transition: "all 0.15s",
        }}>
          {status === "deploying" ? `Deploying ${queue.length} file${queue.length !== 1 ? "s" : ""}…` : `Deploy ${queue.length > 0 ? queue.length + " " : ""}Addon${queue.length !== 1 ? "s" : ""}`}
        </button>
        {(status === "done" || status === "error") && (
          <button onClick={handleReset} style={{
            padding: "13px 20px", background: "transparent", color: "var(--muted)",
            border: "1px solid var(--border-hi)", borderRadius: 8, fontFamily: "var(--sans)", fontWeight: 600, fontSize: 14, cursor: "pointer",
          }}>Reset</button>
        )}
      </div>

      {/* Log */}
      {(logs.length > 0 || status === "deploying") && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", fontSize: 11, fontFamily: "var(--mono)", color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
            {status === "deploying" && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", display: "inline-block", animation: "pulse 1s infinite" }} />}
            Deploy Log
          </div>
          <div style={{ padding: 16, maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
            {logs.map(log => <LogLine key={log.id} message={log.message} type={log.type} />)}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* Results summary */}
      {results && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", fontSize: 11, fontFamily: "var(--mono)", color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Results
          </div>
          <div style={{ padding: "14px 16px", display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[
              { label: "Installed", count: installed, color: "var(--accent)" },
              { label: "Updated",   count: updated,   color: "var(--info)" },
              { label: "Skipped",   count: skipped,   color: "var(--warn)" },
              { label: "Failed",    count: failed,    color: "var(--error)" },
            ].map(({ label, count, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 20, color }}>{count}</span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Guide tab ────────────────────────────────────────────────────────────────
function GuideStep({ number, title, children }) {
  return (
    <div style={{ display: "flex", gap: 20, padding: "24px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ flexShrink: 0, width: 32, height: 32, background: "var(--accent-glow)", border: "1px solid var(--accent-dim)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontWeight: 700, fontSize: 13, color: "var(--accent)" }}>{number}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.7 }}>{children}</div>
      </div>
    </div>
  );
}

function GuideTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--accent)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>Documentation</div>
        <h1 style={{ fontSize: "clamp(24px, 4vw, 38px)", fontWeight: 800, letterSpacing: "-0.02em" }}>How to use it</h1>
        <p style={{ marginTop: 8, color: "var(--text-2)", fontSize: 14, lineHeight: 1.6, maxWidth: 540 }}>
          Everything you need to deploy addons to your Bedrock server in a few minutes.
        </p>
      </div>

      {/* What you need */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {[
          {
            title: "What you need",
            items: [
              "One or more .mcaddon or .mcpack files",
              "A Pelican or Pterodactyl panel URL",
              "A client API key from your panel account",
              "Your server's 8-character server ID",
              `Your world path (default: worlds/default)`,
            ]
          },
          {
            title: "Not on a panel?",
            items: [
              "If you manage your server via SSH and don't use Pelican or Pterodactyl, use the Python CLI instead.",
              `It works the same way but runs directly on your server — no panel needed.`,
            ],
            link: { label: "View mcaddon-cli on GitHub →", href: PYTHON_REPO }
          }
        ].map(({ title, items, link }) => (
          <div key={title} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--accent)", marginBottom: 12 }}>{title}</div>
            <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.75 }}>
              <ul style={{ paddingLeft: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                {items.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
              {link && <a href={link.href} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 12, fontSize: 12 }}>{link.label}</a>}
            </div>
          </div>
        ))}
      </div>

      {/* Supported panels */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--accent)", marginBottom: 14 }}>Supported panels</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {[
            { name: "Pelican Panel",  prefix: "pacc_", note: "Generate under Account → API Credentials" },
            { name: "Pterodactyl",    prefix: "ptlc_", note: "Same location in account settings" },
          ].map(({ name, prefix, note }) => (
            <div key={name} style={{ padding: 14, background: "var(--bg)", border: "1px solid var(--border-hi)", borderRadius: 8 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{note}</div>
              <code style={{ fontSize: 12 }}>{prefix}…</code>
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "0 24px" }}>
        <GuideStep number="1" title="Get your API key">
          Log into your panel. Click your account name → <strong>API Credentials</strong> → <strong>Create New</strong>. Give it a description like "Addon Deployer" and copy the key immediately — it's only shown once. Make sure you're generating a <strong>Client key</strong>, not an Application key. Client keys start with <code>pacc_</code> (Pelican) or <code>ptlc_</code> (Pterodactyl).
        </GuideStep>
        <GuideStep number="2" title="Find your Server ID">
          Go to the server you want to deploy to. Look at the URL — it'll look like <code>panel.example.com/server/a1b2c3d4</code>. That 8-character code is your Server ID.
        </GuideStep>
        <GuideStep number="3" title="Upload your addon files">
          Head to the <button onClick={() => {}} style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", cursor: "pointer", fontSize: 14, fontFamily: "var(--sans)" }}>Deploy tab</button>. Drag and drop your files or click to browse. You can upload multiple <code>.mcaddon</code> or <code>.mcpack</code> files at once and drop more at any time to add to the queue.
        </GuideStep>
        <GuideStep number="4" title="Fill in your panel details">
          Enter your panel URL, API key, Server ID, and world path. If your world is the default generated one leave it as <code>worlds/default</code>. If you renamed your world adjust accordingly.
        </GuideStep>
        <GuideStep number="5" title="Deploy and watch the queue">
          Hit <strong>Deploy</strong>. The tool first checks what's already installed on your server, then processes each file — installing new packs, updating outdated ones, and skipping anything that's already up to date. The live log shows exactly what's happening for each pack.
        </GuideStep>
        <div style={{ padding: "20px 0" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.2)", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>
            <span style={{ color: "var(--warn)", flexShrink: 0 }}>⚠</span>
            <span>Large addon files may take a moment to upload depending on your connection. Don't close the tab while the deploy log is running.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Privacy tab ──────────────────────────────────────────────────────────────
function PrivacyTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--accent)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>Transparency</div>
        <h1 style={{ fontSize: "clamp(24px, 4vw, 38px)", fontWeight: 800, letterSpacing: "-0.02em" }}>Data & Privacy</h1>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 28, display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: 16, borderRadius: 8, background: "rgba(0,229,160,0.05)", border: "1px solid var(--accent-dim)" }}>
          <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }}><ShieldIcon /></span>
          <div style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.7 }}>
            <strong style={{ color: "var(--text)" }}>Your API key is never stored.</strong>{" "}
            It is sent to this server only to make API calls to your panel on your behalf, and discarded immediately after the deployment is complete.
          </div>
        </div>

        {[
          ["API Key & Panel URL", "Sent from your browser over HTTPS, used only to authenticate with your panel, and never written to disk or stored in any database."],
          ["Uploaded addon files", "Processed in memory on this server to extract pack contents and detect pack types. Files are never saved to disk — they are streamed directly to your game server via the panel API and then discarded."],
          ["Server ID", "Used solely to construct the API request URL. Not stored or logged."],
          ["No analytics or tracking", "This site does not use Google Analytics, cookies, or any third-party tracking scripts. No data about your usage is collected."],
          ["Open source", "You can read every line of the server-side code that handles your credentials in the GitHub repository. There are no hidden endpoints or background requests."],
        ].map(([title, body]) => (
          <div key={title} style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{title}</div>
            <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7 }}>
              {title === "Open source"
                ? <>{body} <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">View on GitHub →</a></>
                : body}
            </div>
          </div>
        ))}

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>
          If you're self-hosting this tool, none of your credentials ever leave your own infrastructure. See the{" "}
          <a href={`${GITHUB_URL}#self-hosting`} target="_blank" rel="noopener noreferrer">self-hosting guide</a>{" "}
          in the repository.
        </div>
      </div>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer({ setActiveTab }) {
  const handleTab = (tab) => {
    setActiveTab(tab);
    window.history.pushState(null, "", `#${tab}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer style={{ borderTop: "1px solid var(--border)", paddingTop: 32, paddingBottom: 48, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 13, color: "var(--accent)" }}>{SITE_NAME}</span>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>Open source · AGPL-3.0</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
          <a href={AUTHOR_URL} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontFamily: "var(--mono)", fontWeight: 700, color: "var(--text-2)", transition: "color 0.15s" }}
            onMouseEnter={e => e.target.style.color = "var(--accent)"}
            onMouseLeave={e => e.target.style.color = "var(--text-2)"}
          >{AUTHOR}</a>
          <span style={{ color: "var(--border-hi)" }}>·</span>
          <span style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>The Lazy Lizard</span>
          <span style={{ color: "var(--border-hi)" }}>·</span>
          <a href={KOFI_URL} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--muted)", transition: "color 0.15s" }}
            onMouseEnter={e => e.target.style.color = "#ff5e5b"}
            onMouseLeave={e => e.target.style.color = "var(--muted)"}
          >☕ Ko-fi</a>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => handleTab(tab)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--muted)", fontWeight: 500, fontFamily: "var(--sans)", textTransform: "capitalize", transition: "color 0.15s" }}
            onMouseEnter={e => e.target.style.color = "var(--text-2)"}
            onMouseLeave={e => e.target.style.color = "var(--muted)"}
          >{tab}</button>
        ))}
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)", fontWeight: 500, transition: "color 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--text-2)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--muted)"}
        ><GitHubIcon /> GitHub</a>
      </div>
    </footer>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace("#", "");
    return TABS.includes(hash) ? hash : "deploy";
  });

  // Sync tab when browser back/forward used
  useEffect(() => {
    const fn = () => {
      const hash = window.location.hash.replace("#", "");
      if (TABS.includes(hash)) setActiveTab(hash);
    };
    window.addEventListener("popstate", fn);
    return () => window.removeEventListener("popstate", fn);
  }, []);

  return (
    <>
      <Nav activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="page-wrap" style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ paddingTop: "calc(var(--nav-h) + 48px)", paddingBottom: 48 }}>
          {activeTab === "deploy"  && <DeployTab />}
          {activeTab === "guide"   && <GuideTab />}
          {activeTab === "privacy" && <PrivacyTab />}
        </div>
        <Footer setActiveTab={setActiveTab} />
      </div>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-hamburger { display: flex !important; }
          .nav-by { display: none; }
        }
        @media (max-width: 600px) {
          .page-wrap { padding: 0 16px !important; }
          .deploy-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
