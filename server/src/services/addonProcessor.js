import JSZip from "jszip";
import { compareVersions } from "./apiHandler.js";

const PACK_TYPE_MAP = {
  resources:      "resource",
  data:           "behavior",
  script:         "behavior",
  javascript:     "behavior",
  skin_pack:      "resource",
  world_template: "resource",
};

function detectPackType(manifest) {
  const modules = manifest?.modules ?? [];
  const types = new Set(
    modules.map((m) => PACK_TYPE_MAP[m.type?.toLowerCase()] ?? "unknown")
  );
  if (types.has("resource") && types.has("behavior")) return "both";
  if (types.has("resource")) return "resource";
  if (types.has("behavior")) return "behavior";
  return "unknown";
}

/**
 * Extract all packs from a JSZip instance.
 * Returns array of { manifest, files } where files maps relative paths → JSZip objects.
 */
async function extractPacks(zip) {
  const packs = [];

  for (const [path, file] of Object.entries(zip.files)) {
    if (!path.endsWith("manifest.json") || file.dir) continue;

    const raw = await file.async("string");
    let manifest;
    try {
      manifest = JSON.parse(raw);
    } catch {
      console.warn(`[PROCESSOR] Skipping malformed manifest at ${path}`);
      continue;
    }

    const packRoot = path.substring(0, path.lastIndexOf("manifest.json"));
    const packFiles = {};

    for (const [filePath, zipFile] of Object.entries(zip.files)) {
      if (filePath.startsWith(packRoot) && !zipFile.dir) {
        const relativePath = filePath.substring(packRoot.length);
        packFiles[relativePath] = zipFile;
      }
    }

    packs.push({ manifest, files: packFiles });
  }

  return packs;
}

/**
 * Determine the install status of a pack against what's already on the server.
 *
 * Returns:
 *   { status: "install" }                          — not found, fresh install
 *   { status: "skip",   reason: string }           — same/lower version, skip
 *   { status: "update", oldVersion: [...] }        — higher version, update needed
 */
function resolveInstallStatus(packUuid, incomingVersion, installedMap) {
  const installed = installedMap.get(packUuid);
  if (!installed) return { status: "install" };

  const cmp = compareVersions(incomingVersion, installed.version);
  if (cmp <= 0) {
    return {
      status: "skip",
      reason: cmp === 0
        ? "Same version already installed"
        : "Older version than what's installed",
    };
  }

  return { status: "update", oldVersion: installed.version };
}

/**
 * Upload all files in a pack to the server.
 */
async function uploadPackFiles(api, files, destDir, onLog) {
  for (const [relativePath, zipFile] of Object.entries(files)) {
    const fileBuffer = await zipFile.async("nodebuffer");
    const fileDir = relativePath.includes("/")
      ? `${destDir}/${relativePath.substring(0, relativePath.lastIndexOf("/"))}`
      : destDir;
    const fileName = relativePath.split("/").pop();
    await api.uploadFile(fileDir, fileName, fileBuffer);
  }
  onLog(`  ✔ Files uploaded to ${destDir}`, "success");
}

/**
 * Main processor.
 *
 * Flow:
 *  1. Poll the server's world JSON files to get all installed packs
 *  2. Extract and categorize each incoming pack (install / skip / update)
 *  3. For updates: delete old pack folder first, then upload new files, patch version in JSON
 *  4. For installs: upload files, register in JSON
 *  5. For skips: log and move on
 *
 * @param {Buffer[]} buffers        - Array of file buffers
 * @param {string[]} filenames      - Matching array of original filenames
 * @param {PanelAPI} api            - Initialized PanelAPI instance
 * @param {string}   worldPath      - e.g. "worlds/default"
 * @param {object}   options
 * @param {Function} options.onLog  - Callback (message, type) for progress
 * @returns {object[]} Results per pack
 */
export async function processAddons(buffers, filenames, api, worldPath = "worlds/default", { onLog = () => {} } = {}) {
  const results = [];

  // ── Step 1: Poll installed packs ──────────────────────────────────────────
  onLog("🔍 Checking installed packs on server…", "info");
  let installedMap;
  try {
    installedMap = await api.pollInstalledPacks(worldPath);
    onLog(`  ✔ Found ${installedMap.size} installed pack(s)`, "success");
  } catch (err) {
    console.error("[PROCESSOR] Failed to poll installed packs:", err);
    onLog("  ⚠ Could not read world pack files — treating all packs as new installs.", "warn");
    installedMap = new Map();
  }

  // ── Step 2: Extract all packs from all uploaded files ─────────────────────
  const allPacks = []; // { manifest, files, sourceName, zip }

  for (let i = 0; i < buffers.length; i++) {
    const buffer = buffers[i];
    const filename = filenames[i];
    const isMcAddon = filename.toLowerCase().endsWith(".mcaddon");

    onLog(`\n📦 Reading ${filename}…`, "info");

    let outerZip;
    try {
      outerZip = await JSZip.loadAsync(buffer);
    } catch (err) {
      console.error(`[PROCESSOR] Failed to open ${filename}:`, err);
      onLog(`  ❌ Could not read file — it may be corrupted.`, "error");
      results.push({ name: filename, status: "error", error: "Could not read file — it may be corrupted." });
      continue;
    }

    let packsToProcess = [];

    if (isMcAddon) {
      const mcpackFiles = Object.entries(outerZip.files).filter(
        ([name, f]) => name.toLowerCase().endsWith(".mcpack") && !f.dir
      );

      if (mcpackFiles.length === 0) {
        onLog("  No .mcpack files found inside — treating as single pack.", "warn");
        packsToProcess.push({ zip: outerZip, sourceName: filename });
      } else {
        for (const [packName, packFile] of mcpackFiles) {
          try {
            const packBuffer = await packFile.async("nodebuffer");
            const packZip = await JSZip.loadAsync(packBuffer);
            packsToProcess.push({ zip: packZip, sourceName: filename });
          } catch (err) {
            console.error(`[PROCESSOR] Failed to open inner pack ${packName}:`, err);
            onLog(`  ❌ Could not read ${packName} inside the addon.`, "error");
          }
        }
      }
    } else {
      packsToProcess.push({ zip: outerZip, sourceName: filename });
    }

    for (const { zip, sourceName } of packsToProcess) {
      const packs = await extractPacks(zip);
      if (packs.length === 0) {
        onLog(`  ❌ No valid manifest.json found in ${sourceName}`, "error");
        results.push({ name: sourceName, status: "error", error: "No manifest.json found." });
        continue;
      }
      for (const pack of packs) {
        allPacks.push({ ...pack, sourceName });
      }
    }
  }

  // ── Step 3: Categorize and process each pack ──────────────────────────────
  for (const { manifest, files, sourceName } of allPacks) {
    const header      = manifest?.header ?? {};
    const packUuid    = header.uuid ?? "";
    const packVersion = header.version ?? [0, 0, 1];
    const packName    = (header.name ?? sourceName).replace(/\s+/g, "_");
    const packType    = detectPackType(manifest);

    if (!packUuid) {
      onLog(`\n❌ "${packName}" has no UUID in manifest — skipping.`, "error");
      results.push({ name: packName, sourceName, status: "error", error: "No UUID in manifest." });
      continue;
    }

    const resolution = resolveInstallStatus(packUuid, packVersion, installedMap);

    onLog(`\n📋 "${packName}"`, "info");
    onLog(`   Type: ${packType} | UUID: ${packUuid.slice(0, 8)}… | Version: ${packVersion.join(".")}`, "info");

    // ── Skip ────────────────────────────────────────────────────────────────
    if (resolution.status === "skip") {
      onLog(`  ⚠ ${resolution.reason} — skipping.`, "warn");
      results.push({ name: packName, sourceName, type: packType, uuid: packUuid, status: "skip", reason: resolution.reason });
      continue;
    }

    const isUpdate = resolution.status === "update";
    if (isUpdate) {
      onLog(`  → Update detected: ${resolution.oldVersion.join(".")} → ${packVersion.join(".")}`, "info");
    }

    // ── Deploy (install or update) ───────────────────────────────────────────
    const deploy = async (subfolder, worldJsonFile) => {
      const destDir = `${worldPath}/${subfolder}/${packName}`;
      const packFolderParent = `${worldPath}/${subfolder}`;

      // Delete old folder before update to avoid file conflicts
      if (isUpdate) {
        onLog(`  → Removing old ${subfolder}/${packName}…`, "info");
        try {
          await api.deletePackFolder(packFolderParent, packName);
          onLog(`  ✔ Old pack folder removed`, "success");
        } catch (err) {
          // Log to server, surface friendly message to client
          onLog(`  ❌ Could not remove old pack folder — update aborted for this pack.`, "error");
          throw err;
        }
      }

      // Upload files
      onLog(`  → Uploading to ${destDir}…`, "info");
      await uploadPackFiles(api, files, destDir, onLog);

      // Update JSON
      const jsonPath = `${worldPath}/${worldJsonFile}`;
      if (isUpdate) {
        await api.updatePackVersion(jsonPath, packUuid, packVersion);
        onLog(`  ✔ Version updated in ${worldJsonFile}`, "success");
      } else {
        await api.registerPack(jsonPath, packUuid, packVersion);
        onLog(`  ✔ Registered in ${worldJsonFile}`, "success");
      }
    };

    try {
      if (packType === "resource" || packType === "both") {
        await deploy("resource_packs", "world_resource_packs.json");
      }
      if (packType === "behavior" || packType === "both") {
        await deploy("behavior_packs", "world_behavior_packs.json");
      }
      if (packType === "unknown") {
        onLog(`  ⚠ Could not determine pack type — skipping.`, "warn");
        results.push({ name: packName, sourceName, status: "skip", reason: "Unknown pack type." });
        continue;
      }

      results.push({
        name: packName,
        sourceName,
        type: packType,
        uuid: packUuid,
        version: packVersion,
        status: isUpdate ? "update" : "install",
      });
    } catch (err) {
      console.error(`[PROCESSOR] Deploy failed for ${packName}:`, err);
      onLog(`  ❌ Deployment failed: ${err?.message ?? String(err)}`, "error");
      results.push({ name: packName, sourceName, status: "error", error: "Deployment failed. Check server logs." });
    }
  }

  return results;
}
