import { useState, useCallback } from "react";

export function useDeploy() {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | deploying | done | error
  const [results, setResults] = useState(null);

  const addLog = (message, type = "info") =>
    setLogs((prev) => [...prev, { message, type, id: Date.now() + Math.random() }]);

  const reset = () => {
    setLogs([]);
    setStatus("idle");
    setResults(null);
  };

  const deploy = useCallback(async ({ file, panelUrl, apiKey, serverId, worldPath, restart }) => {
    setLogs([]);
    setResults(null);
    setStatus("deploying");

    const form = new FormData();
    form.append("file", file);
    form.append("panelUrl", panelUrl);
    form.append("apiKey", apiKey);
    form.append("serverId", serverId);
    form.append("worldPath", worldPath || "worlds/default");
    form.append("restart", restart ? "true" : "false");

    try {
      const res = await fetch("/api/addon/deploy", { method: "POST", body: form });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "Request failed");
      }

      // Read the SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Keep incomplete line

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const { type, message } = JSON.parse(line.slice(6));
            if (type === "done") {
              setResults(JSON.parse(message));
              setStatus("done");
            } else {
              addLog(message, type);
            }
          } catch {
            // Malformed SSE line, skip
          }
        }
      }
    } catch (err) {
      addLog(`❌ ${err.message}`, "error");
      setStatus("error");
    }
  }, []);

  return { logs, status, results, deploy, reset };
}
