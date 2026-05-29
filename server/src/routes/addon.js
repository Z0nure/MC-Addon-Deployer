import express from "express";
import multer from "multer";
import { PanelAPI, detectPanel } from "../services/apiHandler.js";
import { processAddon } from "../services/addonProcessor.js";

const router = express.Router();

// Store file in memory — no disk writes on our server
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (req, file, cb) => {
    const allowed = [".mcaddon", ".mcpack"];
    const ext = "." + file.originalname.split(".").pop().toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only .mcaddon and .mcpack files are allowed"));
    }
  },
});

/**
 * POST /api/addon/deploy
 *
 * Multipart form fields:
 *   - file       : the .mcaddon or .mcpack file
 *   - panelUrl   : e.g. https://panel.example.com
 *   - apiKey     : Pelican (pacc_) or Pterodactyl (ptlc_) client API key
 *   - serverId   : server identifier
 *   - worldPath  : e.g. worlds/default  (optional, defaults to worlds/default)
 *   - restart    : "true" to restart server after deploy (optional)
 *
 * Streams progress back as Server-Sent Events (SSE)
 */
router.post("/deploy", upload.single("file"), async (req, res) => {
  const { panelUrl, apiKey, serverId, worldPath = "worlds/default", restart = "false" } = req.body;

  // Validate required fields
  if (!panelUrl || !apiKey || !serverId) {
    return res.status(400).json({ error: "panelUrl, apiKey, and serverId are required." });
  }
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  // Set up SSE so the client gets live progress logs
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (type, message) => {
    res.write(`data: ${JSON.stringify({ type, message })}\n\n`);
  };

  try {
    const panelType = detectPanel(apiKey);

    // Warn if they accidentally used an application key instead of a client key
    if (panelType === "pterodactyl-app") {
      send("warn", "⚠ Detected a Pterodactyl application key (ptla_). You need a client key (ptlc_) instead.");
    } else if (panelType === "unknown") {
      send("warn", "⚠ Unrecognized API key prefix. Proceeding anyway — check your key if this fails.");
    } else {
      const label = panelType === "pelican" ? "Pelican" : "Pterodactyl";
      send("info", `🎛 Panel detected: ${label}`);
    }

    const api = new PanelAPI(panelUrl, apiKey, serverId);

    const results = await processAddon(
      req.file.buffer,
      req.file.originalname,
      api,
      worldPath,
      { onLog: (msg, type) => send(type, msg) }
    );

    if (restart === "true") {
      send("info", "\n🔄 Restarting server...");
      await api.restartServer();
      send("success", "✔ Server restarted");
    }

    send("done", JSON.stringify(results));
  } catch (err) {
    send("error", `Fatal error: ${err.message}`);
  } finally {
    res.end();
  }
});

/**
 * POST /api/addon/validate
 * Quick validate an addon file without deploying — returns pack info.
 */
router.post("/validate", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  try {
    const mockApi = {
      uploadFile: async () => {},
      registerPack: async () => true,
      readPackJson: async () => [],
    };

    const results = await processAddon(
      req.file.buffer,
      req.file.originalname,
      mockApi,
      "worlds/default",
      { onLog: () => {} }
    );

    res.json({ valid: results.some((r) => r.success), packs: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
