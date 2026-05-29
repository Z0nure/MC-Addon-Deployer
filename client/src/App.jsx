import { useState, useRef, useEffect } from "react";
import { useDeploy } from "./hooks/useDeploy.js";

// ─── Replace with your actual GitHub URL ──────────────────────────────────────
const GITHUB_URL = "https://github.com/yourusername/mc-addon-deployer";

// ─── Icons (inline SVG, no deps) ─────────────────────────────────────────────
const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const BookIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
  </svg>
);

const ZapIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Close menu on nav link click
  const handleNavClick = () => setMenuOpen(false);

  const navLinks = [["#guide", "Guide"], ["#deploy", "Deploy"], ["#privacy", "Privacy"]];

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      borderBottom: `1px solid ${scrolled || menuOpen ? "var(--border)" : "transparent"}`,
      background: scrolled || menuOpen ? "rgba(8,8,9,0.96)" : "transparent",
      backdropFilter: scrolled || menuOpen ? "blur(12px)" : "none",
      transition: "background 0.2s, border-color 0.2s",
    }}>
      {/* Main bar */}
      <div style={{
        height: "var(--nav-h)", display: "flex", alignItems: "center", padding: "0 24px",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{
            fontFamily: "var(--mono)", fontWeight: 700, fontSize: 13,
            color: "var(--accent)", letterSpacing: "-0.02em", whiteSpace: "nowrap",
          }}>mc-addon-deployer</span>
          <span style={{
            fontSize: 10, fontFamily: "var(--mono)", color: "var(--muted)",
            background: "var(--surface-2)", border: "1px solid var(--border-hi)",
            padding: "1px 6px", borderRadius: 3, letterSpacing: "0.05em", flexShrink: 0,
          }}>v1.0</span>
          <span className="nav-by" style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)", whiteSpace: "nowrap" }}>
            by{" "}
            <a href="https://zonure.xyz" target="_blank" rel="noopener noreferrer"
              style={{ color: "var(--muted)", transition: "color 0.15s" }}
              onMouseEnter={e => e.target.style.color = "var(--accent)"}
              onMouseLeave={e => e.target.style.color = "var(--muted)"}
            >Zonure</a>
          </span>
        </div>

        {/* Desktop links */}
        <div className="nav-desktop" style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {navLinks.map(([href, label]) => (
            <a key={href} href={href} style={{
              fontSize: 13, color: "var(--text-2)", fontWeight: 600,
              letterSpacing: "0.02em", transition: "color 0.15s",
            }}
            onMouseEnter={e => e.target.style.color = "var(--text)"}
            onMouseLeave={e => e.target.style.color = "var(--text-2)"}
            >{label}</a>
          ))}
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" style={{
            display: "flex", alignItems: "center", gap: 6,
            color: "var(--text-2)", fontSize: 13, fontWeight: 600,
            padding: "6px 12px", border: "1px solid var(--border-hi)", borderRadius: 6,
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-hi)"; e.currentTarget.style.color = "var(--text-2)"; }}
          >
            <GitHubIcon /> GitHub
          </a>
        </div>

        {/* Hamburger button — shown only on mobile via CSS */}
        <button className="nav-hamburger" onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
          style={{
            display: "none", background: "none", border: "none",
            cursor: "pointer", padding: 8, flexDirection: "column",
            gap: 5, alignItems: "center", justifyContent: "center",
          }}
        >
          <span style={{ display: "block", width: 22, height: 2, background: "var(--text)", borderRadius: 2, transition: "transform 0.2s, opacity 0.2s", transform: menuOpen ? "translateY(7px) rotate(45deg)" : "none" }} />
          <span style={{ display: "block", width: 22, height: 2, background: "var(--text)", borderRadius: 2, transition: "opacity 0.2s", opacity: menuOpen ? 0 : 1 }} />
          <span style={{ display: "block", width: 22, height: 2, background: "var(--text)", borderRadius: 2, transition: "transform 0.2s, opacity 0.2s", transform: menuOpen ? "translateY(-7px) rotate(-45deg)" : "none" }} />
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div style={{
          borderTop: "1px solid var(--border)",
          padding: "8px 24px 20px",
          display: "flex", flexDirection: "column",
        }}>
          {navLinks.map(([href, label]) => (
            <a key={href} href={href} onClick={handleNavClick} style={{
              fontSize: 15, color: "var(--text-2)", fontWeight: 600,
              padding: "14px 0", borderBottom: "1px solid var(--border)",
              display: "block", transition: "color 0.15s",
            }}
            onMouseEnter={e => e.target.style.color = "var(--text)"}
            onMouseLeave={e => e.target.style.color = "var(--text-2)"}
            >{label}</a>
          ))}
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
            onClick={handleNavClick}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 15, color: "var(--text-2)", fontWeight: 600,
              padding: "14px 0", transition: "color 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--accent)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--text-2)"}
          >
            <GitHubIcon /> GitHub
          </a>
        </div>
      )}
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{
      paddingTop: "calc(var(--nav-h) + 80px)",
      paddingBottom: 80,
      textAlign: "center",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Glow */}
      <div style={{
        position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)",
        width: 600, height: 300,
        background: "radial-gradient(ellipse, rgba(0,229,160,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: 11, fontFamily: "var(--mono)", color: "var(--accent)",
        letterSpacing: "0.15em", textTransform: "uppercase",
        padding: "4px 12px",
        border: "1px solid var(--accent-dim)", borderRadius: 20,
        marginBottom: 24,
      }}>
        <ZapIcon /> Bedrock Server Tool
      </div>

      <h1 style={{
        fontSize: "clamp(36px, 6vw, 64px)",
        fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.05,
        marginBottom: 20,
      }}>
        Deploy Minecraft addons<br />
        <span style={{ color: "var(--accent)" }}>without the manual grind</span>
      </h1>

      <p style={{
        fontSize: 16, color: "var(--text-2)", lineHeight: 1.7,
        maxWidth: 520, margin: "0 auto 36px",
      }}>
        Upload a <code>.mcaddon</code> or <code>.mcpack</code> and deploy it directly
        to your Pelican or Pterodactyl Bedrock server — no phone, no panel clicking,
        no manual JSON editing.
      </p>

      <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
        <a href="#deploy" style={{
          padding: "12px 28px", background: "var(--accent)", color: "#000",
          borderRadius: 8, fontWeight: 700, fontSize: 14, letterSpacing: "0.02em",
          border: "none", cursor: "pointer", display: "inline-block",
          transition: "opacity 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >Deploy an Addon</a>
        <a href="#guide" style={{
          padding: "12px 28px", background: "transparent", color: "var(--text-2)",
          borderRadius: 8, fontWeight: 600, fontSize: 14,
          border: "1px solid var(--border-hi)", display: "inline-block",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--text-2)"; e.currentTarget.style.color = "var(--text)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-hi)"; e.currentTarget.style.color = "var(--text-2)"; }}
        >Read the Guide</a>
      </div>

      {/* Supported panels */}
      <div style={{
        marginTop: 48, display: "flex", justifyContent: "center",
        alignItems: "center", gap: 24, flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Supports
        </span>
        {["Pelican Panel", "Pterodactyl"].map(p => (
          <span key={p} style={{
            fontSize: 12, color: "var(--text-2)", fontFamily: "var(--mono)",
            padding: "4px 10px", border: "1px solid var(--border-hi)",
            borderRadius: 4,
          }}>{p}</span>
        ))}
        <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          + Python CLI for SSH users
        </span>
      </div>
    </section>
  );
}

// ─── Guide ────────────────────────────────────────────────────────────────────
function GuideStep({ number, title, children }) {
  return (
    <div style={{
      display: "flex", gap: 20,
      padding: "24px 0",
      borderBottom: "1px solid var(--border)",
    }}>
      <div style={{
        flexShrink: 0,
        width: 32, height: 32,
        background: "var(--accent-glow)", border: "1px solid var(--accent-dim)",
        borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--mono)", fontWeight: 700, fontSize: 13, color: "var(--accent)",
      }}>{number}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.7 }}>{children}</div>
      </div>
    </div>
  );
}

function InfoCard({ title, icon, children }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 10, padding: 20,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        color: "var(--accent)", marginBottom: 12,
        fontSize: 13, fontWeight: 700,
      }}>
        {icon} {title}
      </div>
      <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.75 }}>
        {children}
      </div>
    </div>
  );
}

function Guide() {
  return (
    <section id="guide" style={{ padding: "80px 0" }}>
      <div style={{ marginBottom: 48 }}>
        <div style={{
          fontSize: 11, fontFamily: "var(--mono)", color: "var(--accent)",
          letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12,
        }}>Documentation</div>
        <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, letterSpacing: "-0.02em" }}>
          How to use it
        </h2>
        <p style={{ marginTop: 10, color: "var(--text-2)", fontSize: 14, lineHeight: 1.6, maxWidth: 520 }}>
          Everything you need to deploy addons to your Bedrock server in a few minutes.
        </p>
      </div>

      {/* What you need */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16, marginBottom: 48,
      }}>
        <InfoCard title="What you need" icon={<BookIcon />}>
          <ul style={{ paddingLeft: 16, display: "flex", flexDirection: "column", gap: 6 }}>
            <li>A <code>.mcaddon</code> or <code>.mcpack</code> file</li>
            <li>A Pelican or Pterodactyl panel URL</li>
            <li>A client API key from your panel account</li>
            <li>Your server's 8-character server ID</li>
            <li>Your world path (default: <code>worlds/default</code>)</li>
          </ul>
        </InfoCard>
        <InfoCard title="Supported panels" icon={<ZapIcon />}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <div style={{ color: "var(--text)", fontWeight: 600, marginBottom: 2 }}>Pelican Panel</div>
              <div>API key starts with <code>pacc_</code> — generate under Account → API Credentials</div>
            </div>
            <div>
              <div style={{ color: "var(--text)", fontWeight: 600, marginBottom: 2 }}>Pterodactyl</div>
              <div>API key starts with <code>ptlc_</code> — same location in account settings</div>
            </div>
          </div>
        </InfoCard>
      </div>

      {/* Steps */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 12, padding: "0 24px",
      }}>
        <GuideStep number="1" title="Get your API key">
          Log into your Pelican or Pterodactyl panel. Click your account name in the top right →{" "}
          <strong>API Credentials</strong> → <strong>Create New</strong>. Give it a description like
          "Addon Deployer" and copy the key immediately — it's only shown once. Make sure you're
          generating a <strong>Client key</strong> (not Application). Client keys start with{" "}
          <code>pacc_</code> (Pelican) or <code>ptlc_</code> (Pterodactyl).
        </GuideStep>

        <GuideStep number="2" title="Find your Server ID">
          On your panel, go to the server you want to deploy to. Look at the URL — it'll look like{" "}
          <code>panel.example.com/server/a1b2c3d4</code>. That 8-character code at the end is your
          Server ID. You can also find it in the server's settings page.
        </GuideStep>

        <GuideStep number="3" title="Upload your addon">
          Head to the <a href="#deploy">Deploy section</a> below. Drag and drop your{" "}
          <code>.mcaddon</code> or <code>.mcpack</code> file into the drop zone, or click to browse.
          Both formats are supported. If your addon bundles both a resource pack and a behavior pack,
          both will be detected and deployed automatically.
        </GuideStep>

        <GuideStep number="4" title="Fill in your panel details">
          Enter your panel URL (e.g. <code>https://panel.example.com</code>), paste your API key,
          enter your Server ID, and set the world path. If your world is the default generated one,
          leave it as <code>worlds/default</code>. If you renamed your world, adjust accordingly.
        </GuideStep>

        <GuideStep number="5" title="Deploy and watch the log">
          Hit <strong>Deploy Addon</strong>. You'll see a live log stream as the tool extracts
          the addon, detects pack types, uploads each file to your server, and registers it in
          the world JSON files. Optionally check "Restart server after deploying" to have it
          restart automatically so the addon takes effect immediately.
        </GuideStep>

        <div style={{ padding: "20px 0" }}>
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.2)",
            borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "var(--text-2)", lineHeight: 1.6,
          }}>
            <span style={{ color: "var(--warn)", fontSize: 16, flexShrink: 0 }}>⚠</span>
            <span>
              <strong style={{ color: "var(--warn)" }}>Heads up:</strong> Some addon files are very large
              and may take a moment to upload depending on your connection. Don't close the tab while
              the deploy log is running.
            </span>
          </div>
        </div>
      </div>

      {/* Python CLI callout */}
      <div style={{
        marginTop: 24,
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 12, padding: 24,
        display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap",
      }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Prefer the command line?</div>
          <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7 }}>
            A standalone Python script is available in the repository for SSH users who don't use a
            panel. No dependencies — just Python 3. Works with <code>.mcaddon</code> and{" "}
            <code>.mcpack</code> and handles everything the same way.
          </div>
        </div>
        <a href={`${GITHUB_URL}/tree/main/python`} target="_blank" rel="noopener noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
          padding: "10px 18px", border: "1px solid var(--border-hi)", borderRadius: 8,
          color: "var(--text-2)", fontSize: 13, fontWeight: 600, alignSelf: "center",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-hi)"; e.currentTarget.style.color = "var(--text-2)"; }}
        >
          <GitHubIcon /> View on GitHub
        </a>
      </div>
    </section>
  );
}

// ─── Deploy form components ───────────────────────────────────────────────────
function Field({ label, type = "text", value, onChange, placeholder, hint }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{
        fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
        color: "var(--muted)", textTransform: "uppercase", fontFamily: "var(--mono)",
      }}>{label}</label>
      <input
        type={type} value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          background: "var(--bg)", border: `1px solid ${focused ? "var(--accent)" : "var(--border-hi)"}`,
          borderRadius: 6, padding: "10px 14px", color: "var(--text)",
          fontFamily: "var(--mono)", fontSize: 13, outline: "none", transition: "border-color 0.15s",
        }}
      />
      {hint && <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>{hint}</span>}
    </div>
  );
}

function DropZone({ file, onFile }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();
  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };
  return (
    <div
      onClick={() => inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${dragging ? "var(--accent)" : file ? "var(--accent-dim)" : "var(--border-hi)"}`,
        borderRadius: 8, padding: "36px 24px", textAlign: "center", cursor: "pointer",
        background: dragging ? "var(--accent-glow)" : file ? "rgba(0,229,160,0.02)" : "transparent",
        transition: "all 0.15s",
      }}
    >
      <input ref={inputRef} type="file" accept=".mcaddon,.mcpack"
        style={{ display: "none" }}
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />
      <div style={{ fontSize: 32, marginBottom: 10 }}>{file ? "📦" : "⬆️"}</div>
      {file ? (
        <>
          <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--accent)", marginBottom: 4 }}>{file.name}</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>{(file.size / 1024).toFixed(1)} KB — click to change</div>
        </>
      ) : (
        <>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Drop your addon here</div>
          <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)" }}>.mcaddon · .mcpack</div>
        </>
      )}
    </div>
  );
}

function LogLine({ message, type }) {
  const colors = { success: "var(--accent)", error: "var(--error)", warn: "var(--warn)", info: "var(--text)", done: "var(--accent)" };
  return (
    <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: colors[type] ?? "var(--text)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
      {message}
    </div>
  );
}

function ResultCard({ result }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "10px 14px", background: "var(--bg)",
      border: `1px solid ${result.success ? "var(--accent-dim)" : "var(--error)"}`,
      borderRadius: 6,
    }}>
      <span style={{ color: result.success ? "var(--accent)" : "var(--error)", fontFamily: "var(--mono)", fontWeight: 700 }}>
        {result.success ? "✔" : "✘"}
      </span>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{result.name}</div>
        {result.type && (
          <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)", marginTop: 2 }}>
            {result.type} pack · {result.uuid?.slice(0, 8)}…
          </div>
        )}
        {result.error && (
          <div style={{ fontSize: 11, color: "var(--error)", fontFamily: "var(--mono)", marginTop: 2 }}>{result.error}</div>
        )}
      </div>
    </div>
  );
}

// ─── Deploy section ───────────────────────────────────────────────────────────
function DeploySection() {
  const [file, setFile] = useState(null);
  const [panelUrl, setPanelUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [serverId, setServerId] = useState("");
  const [worldPath, setWorldPath] = useState("worlds/default");
  const [restart, setRestart] = useState(false);
  const { logs, status, results, deploy, reset } = useDeploy();
  const logsEndRef = useRef();

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  const canDeploy = file && panelUrl && apiKey && serverId && status !== "deploying";

  const handleDeploy = () => {
    if (!canDeploy) return;
    deploy({ file, panelUrl, apiKey, serverId, worldPath, restart });
  };

  const handleReset = () => { reset(); setFile(null); };

  return (
    <section id="deploy" style={{ padding: "80px 0" }}>
      <div style={{ marginBottom: 36 }}>
        <div style={{
          fontSize: 11, fontFamily: "var(--mono)", color: "var(--accent)",
          letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12,
        }}>Deploy Tool</div>
        <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, letterSpacing: "-0.02em" }}>
          Deploy your addon
        </h2>
        <p style={{ marginTop: 10, color: "var(--text-2)", fontSize: 14, lineHeight: 1.6 }}>
          Fill in your panel details and drop your addon. Everything is handled automatically.
        </p>
      </div>

      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 12, padding: 28,
        display: "flex", flexDirection: "column", gap: 22,
      }}>
        <DropZone file={file} onFile={setFile} />

        <div className="deploy-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <Field label="Panel URL" value={panelUrl} onChange={setPanelUrl} placeholder="https://panel.example.com" />
          <Field label="Server ID" value={serverId} onChange={setServerId} placeholder="a1b2c3d4" />
        </div>

        <Field label="API Key" type="password" value={apiKey} onChange={setApiKey}
          placeholder="pacc_… or ptlc_…"
          hint="Client API key — Account → API Credentials in your panel" />

        <Field label="World Path" value={worldPath} onChange={setWorldPath}
          placeholder="worlds/default"
          hint="Path relative to your container root, as seen in the panel file manager" />

        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "var(--text-2)", userSelect: "none" }}>
          <input type="checkbox" checked={restart} onChange={(e) => setRestart(e.target.checked)}
            style={{ accentColor: "var(--accent)", width: 15, height: 15 }} />
          Restart server after deploying
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleDeploy} disabled={!canDeploy} style={{
            flex: 1, padding: "13px 24px",
            background: canDeploy ? "var(--accent)" : "var(--border)",
            color: canDeploy ? "#000" : "var(--muted)",
            border: "none", borderRadius: 8,
            fontFamily: "var(--sans)", fontWeight: 700, fontSize: 14,
            cursor: canDeploy ? "pointer" : "not-allowed",
            transition: "all 0.15s", letterSpacing: "0.02em",
          }}>
            {status === "deploying" ? "Deploying…" : "Deploy Addon"}
          </button>
          {(status === "done" || status === "error") && (
            <button onClick={handleReset} style={{
              padding: "13px 20px", background: "transparent", color: "var(--muted)",
              border: "1px solid var(--border-hi)", borderRadius: 8,
              fontFamily: "var(--sans)", fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}>Reset</button>
          )}
        </div>
      </div>

      {(logs.length > 0 || status === "deploying") && (
        <div style={{ marginTop: 16, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{
            padding: "10px 16px", borderBottom: "1px solid var(--border)",
            fontSize: 11, fontFamily: "var(--mono)", color: "var(--muted)",
            letterSpacing: "0.1em", textTransform: "uppercase",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            {status === "deploying" && (
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", display: "inline-block", animation: "pulse 1s infinite" }} />
            )}
            Deploy Log
          </div>
          <div style={{ padding: 16, maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
            {logs.map((log) => <LogLine key={log.id} message={log.message} type={log.type} />)}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {results && (
        <div style={{ marginTop: 16, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{
            padding: "10px 16px", borderBottom: "1px solid var(--border)",
            fontSize: 11, fontFamily: "var(--mono)", color: "var(--muted)",
            letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            Results · {results.filter(r => r.success).length}/{results.length} packs deployed
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {results.map((r, i) => <ResultCard key={i} result={r} />)}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Privacy ──────────────────────────────────────────────────────────────────
function Privacy() {
  return (
    <section id="privacy" style={{ padding: "80px 0" }}>
      <div style={{ marginBottom: 36 }}>
        <div style={{
          fontSize: 11, fontFamily: "var(--mono)", color: "var(--accent)",
          letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12,
        }}>Transparency</div>
        <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, letterSpacing: "-0.02em" }}>
          Data & Privacy
        </h2>
      </div>

      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 12, padding: 28, display: "flex", flexDirection: "column", gap: 24,
      }}>
        <div style={{
          display: "flex", gap: 14, alignItems: "flex-start",
          padding: 16, borderRadius: 8,
          background: "rgba(0,229,160,0.05)", border: "1px solid var(--accent-dim)",
        }}>
          <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }}><ShieldIcon /></span>
          <div style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.7 }}>
            <strong style={{ color: "var(--text)" }}>Your API key is never stored.</strong>{" "}
            It is sent to this server only to make API calls to your panel on your behalf, and discarded
            immediately after the deployment is complete. We do not log, persist, or transmit your credentials anywhere else.
          </div>
        </div>

        {[
          ["API Key & Panel URL", "Sent from your browser to this server over HTTPS, used only to authenticate with your Pelican or Pterodactyl panel, and never written to disk or stored in any database."],
          ["Uploaded addon files", "Processed in memory on this server to extract pack contents and detect pack types. Files are never saved to disk on our end — they are streamed directly to your game server via the panel API and then discarded."],
          ["Server ID", "Used solely to construct the API request URL. Not stored or logged."],
          ["No analytics or tracking", "This site does not use Google Analytics, cookies, or any third-party tracking scripts. No data about your usage is collected."],
          ["Open source", `You can read every line of the server-side code that handles your credentials in the GitHub repository. There are no hidden endpoints or background requests.`],
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

        <div style={{
          borderTop: "1px solid var(--border)", paddingTop: 20,
          fontSize: 12, color: "var(--muted)", lineHeight: 1.7,
        }}>
          If you're self-hosting this tool (recommended for production use), none of your credentials ever
          leave your own infrastructure. See the{" "}
          <a href={`${GITHUB_URL}#self-hosting`} target="_blank" rel="noopener noreferrer">self-hosting guide</a>{" "}
          in the repository.
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{
      borderTop: "1px solid var(--border)", paddingTop: 32, paddingBottom: 48,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 16,
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 13, color: "var(--accent)" }}>
          mc-addon-deployer
        </span>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          Open source · MIT License
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <a href="https://zonure.xyz" target="_blank" rel="noopener noreferrer" style={{
            fontSize: 12, fontFamily: "var(--mono)", fontWeight: 700,
            color: "var(--text-2)", letterSpacing: "0.05em",
            transition: "color 0.15s",
          }}
          onMouseEnter={e => e.target.style.color = "var(--accent)"}
          onMouseLeave={e => e.target.style.color = "var(--text-2)"}
          >Zonure</a>
          <span style={{ color: "var(--border-hi)" }}>·</span>
          <span style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
            The Lazy Lizard
          </span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        {[["#guide", "Guide"], ["#deploy", "Deploy"], ["#privacy", "Privacy"]].map(([href, label]) => (
          <a key={href} href={href} style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}
          onMouseEnter={e => e.target.style.color = "var(--text-2)"}
          onMouseLeave={e => e.target.style.color = "var(--muted)"}
          >{label}</a>
        ))}
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)", fontWeight: 500 }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--text-2)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--muted)"}
        >
          <GitHubIcon /> GitHub
        </a>
      </div>
    </footer>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <>
      <Nav />
      <div className="page-wrap" style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
        <Hero />
        <div style={{ borderTop: "1px solid var(--border)" }} />
        <Guide />
        <div style={{ borderTop: "1px solid var(--border)" }} />
        <DeploySection />
        <div style={{ borderTop: "1px solid var(--border)" }} />
        <Privacy />
        <Footer />
      </div>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

        /* ── Mobile nav ── */
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-hamburger { display: flex !important; }
          .nav-by { display: none; }
        }

        /* ── General mobile layout ── */
        @media (max-width: 600px) {
          /* Tighter side padding */
          .page-wrap { padding: 0 16px !important; }

          /* Hero */
          .hero-badges { flex-direction: column; align-items: flex-start; gap: 8px !important; }
          .hero-ctas { flex-direction: column; }
          .hero-ctas a { text-align: center; }
          .hero-panels { flex-direction: column; align-items: flex-start; gap: 8px !important; }

          /* Guide step number + content — keep flex but tighter gap */
          .guide-step { gap: 12px !important; padding: 20px 0 !important; }

          /* Warning callout wraps nicely already, just reduce padding */
          .warn-box { padding: 10px 12px !important; }

          /* Python callout — stack vertically */
          .python-callout { flex-direction: column !important; }
          .python-callout a { align-self: flex-start !important; }

          /* Deploy form */
          .deploy-grid { grid-template-columns: 1fr !important; }

          /* Privacy highlight box */
          .privacy-highlight { flex-direction: column; gap: 10px !important; }

          /* Footer — already wraps, just tighten */
          .footer-links { gap: 16px !important; }
        }
      `}</style>
    </>
  );
}
