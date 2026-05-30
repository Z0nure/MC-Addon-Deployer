import express from "express";
import multer from "multer";
import { PanelAPI, detectPanel } from "../services/apiHandler.js";
import { processAddons } from "../services/addonProcessor.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB per file
  fileFilter: (req, file, cb) => {
    const ext = "." + file.originalname.split(".").pop().toLowerCase();
    if ([".mcaddon", ".mcpack"].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only .mcaddon and .mcpack files are allowed."));
    }
  },
});

/**
 * POST /api/addon/deploy
 *
 * Multipart form fields:
 *   - files[]    : one or more .mcaddon / .mcpack files
 *   - panelUrl   : e.g. https://panel.example.com
 *   - apiKey     : Pelican (pacc_) or Pterodactyl (ptlc_) client API key
 *   - serverId   : server identifier
 *   - worldPath  : world path, default "worlds/default"
 *   - restart    : "true" to restart server after deploy
 *
 * Streams progress as Server-Sent Events (SSE).
 */
router.post("/deploy", upload.array("files[]", 50), async (req, res) => {
  const { panelUrl, apiKey, serverId, worldPath = "worlds/default", restart = "false" } = req.body;

  if (!panelUrl || !apiKey || !serverId) {
    return res.status(400).json({ error: "panelUrl, apiKey, and serverId are required." });
  }
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded." });
  }

  // SSE setup
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (type, message) => {
    res.write(`data: ${JSON.stringify({ type, message })}\n\n`);
  };

  try {
    const panelType = detectPanel(apiKey);
    console.log(`[ROUTE] Deploy — panel: ${panelType}, server: ${serverId}, files: ${req.files.length}`);

    if (panelType === "pterodactyl-app") {
      send("warn", "⚠ Detected a Pterodactyl application key (ptla_). You need a client key (ptlc_) instead.");
    } else if (panelType === "unknown") {
      send("warn", "⚠ Unrecognized API key prefix — check your key if something goes wrong.");
    }

    const api = new PanelAPI(panelUrl, apiKey, serverId);

    const results = await processAddons(
      req.files.map((f) => f.buffer),
      req.files.map((f) => f.originalname),
      api,
      worldPath,
      { onLog: (msg, type) => send(type, msg) }
    );

    if (restart === "true") {
      send("info", "\n🔄 Restarting server…");
      try {
        await api.restartServer();
        send("success", "✔ Server restarted");
      } catch (err) {
        console.error("[ROUTE] Failed to restart server:", err);
        send("warn", "⚠ Could not restart the server — you may need to do it manually.");
      }
    }

    send("done", JSON.stringify(results));
  } catch (err) {
    console.error("[ROUTE] Fatal deploy error:", err);
    send("error", `Fatal error: ${err?.message ?? String(err)}`);
  } finally {
    res.end();
  }
});

/**
 * POST /api/addon/validate
 * Validate files without deploying — returns pack info and install status.
 */
router.post("/validate", upload.array("files[]", 50), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded." });
  }

  try {
    const mockApi = {
      pollInstalledPacks: async () => new Map(),
      uploadFile: async () => {},
      registerPack: async () => true,
      updatePackVersion: async () => true,
      deletePackFolder: async () => {},
      readPackJson: async () => [],
    };

    const results = await processAddons(
      req.files.map((f) => f.buffer),
      req.files.map((f) => f.originalname),
      mockApi,
      "worlds/default",
      { onLog: () => {} }
    );

    res.json({ packs: results });
  } catch (err) {
    console.error("[ROUTE] Validate error:", err);
    res.status(500).json({ error: "Validation failed." });
  }
});

export default router;

/**
 * POST /api/addon/installed
 * Fetch all installed addons from the server, grouped by name.
 */
router.post("/installed", async (req, res) => {
  const { panelUrl, apiKey, serverId, worldPath = "worlds/default" } = req.body;

  if (!panelUrl || !apiKey || !serverId) {
    return res.status(400).json({ error: "panelUrl, apiKey, and serverId are required." });
  }

  try {
    const { fetchInstalledAddons } = await import("../services/addonProcessor.js");
    const api = new PanelAPI(panelUrl, apiKey, serverId);
    const addons = await fetchInstalledAddons(api, worldPath);
    res.json({ addons });
  } catch (err) {
    console.error("[ROUTE] fetchInstalledAddons error:", err);
    res.status(500).json({ error: "Could not fetch installed addons. Check your panel details." });
  }
});

/**
 * POST /api/addon/uninstall
 * Remove one or more addons from the server.
 *
 * Body: {
 *   panelUrl, apiKey, serverId, worldPath,
 *   addons: [{ name, resource: { uuid, folder } | null, behavior: { uuid, folder } | null }]
 * }
 */
router.post("/uninstall", async (req, res) => {
  const { panelUrl, apiKey, serverId, worldPath = "worlds/default", addons } = req.body;

  if (!panelUrl || !apiKey || !serverId || !addons?.length) {
    return res.status(400).json({ error: "panelUrl, apiKey, serverId, and addons are required." });
  }

  // SSE stream
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (type, message) => res.write(`data: ${JSON.stringify({ type, message })}\n\n`);

  try {
    const api = new PanelAPI(panelUrl, apiKey, serverId);
    const results = [];

    for (const addon of addons) {
      console.log(`[ROUTE] Uninstalling "${addon.name}"`);
      const errors = [];

      // Remove resource pack
      if (addon.resource) {
        try {
          if (addon.resource.folder) {
            await api.deletePackFolder(`${worldPath}/resource_packs`, addon.resource.folder);
          }
          if (addon.resource.uuid) {
            await api.removePackEntry(`${worldPath}/world_resource_packs.json`, addon.resource.uuid);
          }
          send("success", `✔ ${addon.name} — resource pack removed`);
        } catch (err) {
          console.error(`[ROUTE] Failed to remove resource pack for "${addon.name}":`, err);
          errors.push("resource pack removal failed");
          send("error", `❌ ${addon.name} — resource pack removal failed`);
        }
      }

      // Remove behavior pack
      if (addon.behavior) {
        try {
          if (addon.behavior.folder) {
            await api.deletePackFolder(`${worldPath}/behavior_packs`, addon.behavior.folder);
          }
          if (addon.behavior.uuid) {
            await api.removePackEntry(`${worldPath}/world_behavior_packs.json`, addon.behavior.uuid);
          }
          send("success", `✔ ${addon.name} — behavior pack removed`);
        } catch (err) {
          console.error(`[ROUTE] Failed to remove behavior pack for "${addon.name}":`, err);
          errors.push("behavior pack removal failed");
          send("error", `❌ ${addon.name} — behavior pack removal failed`);
        }
      }

      results.push({
        name: addon.name,
        status: errors.length === 0 ? "removed" : "partial",
        errors,
      });
    }

    send("done", JSON.stringify(results));
  } catch (err) {
    console.error("[ROUTE] Uninstall fatal error:", err);
    send("error", "Something went wrong during uninstall. Check server logs.");
  } finally {
    res.end();
  }
});
