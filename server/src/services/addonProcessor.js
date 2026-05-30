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
async function uploadPackFiles(api, files, destDir) {
  for (const [relativePath, zipFile] of Object.entries(files)) {
    const fileBuffer = await zipFile.async("nodebuffer");
    const fileDir = relativePath.includes("/")
      ? `${destDir}/${relativePath.substring(0, relativePath.lastIndexOf("/"))}`
      : destDir;
    const fileName = relativePath.split("/").pop();
    await api.uploadFile(fileDir, fileName, fileBuffer);
  }
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
  onLog("Checking installed packs on server…", "info");
  let installedMap;
  try {
    installedMap = await api.pollInstalledPacks(worldPath);
    onLog(`Found ${installedMap.size} installed pack(s)`, "info");
  } catch (err) {
    console.error("[PROCESSOR] Failed to poll installed packs:", err);
    onLog("⚠ Could not read world pack files — treating all as new installs.", "warn");
    installedMap = new Map();
  }

  // ── Step 2: Extract all packs from all uploaded files ─────────────────────
  const allPacks = [];

  for (let i = 0; i < buffers.length; i++) {
    const buffer = buffers[i];
    const filename = filenames[i];
    const isMcAddon = filename.toLowerCase().endsWith(".mcaddon");

    console.log(`[PROCESSOR] Reading ${filename}`);

    let outerZip;
    try {
      outerZip = await JSZip.loadAsync(buffer);
    } catch (err) {
      console.error(`[PROCESSOR] Failed to open ${filename}:`, err);
      onLog(`❌ ${filename} — could not read file, it may be corrupted.`, "error");
      results.push({ name: filename, sourceName: filename, status: "error", error: "Could not read file — it may be corrupted." });
      continue;
    }

    let packsToProcess = [];

    if (isMcAddon) {
      const mcpackFiles = Object.entries(outerZip.files).filter(
        ([name, f]) => name.toLowerCase().endsWith(".mcpack") && !f.dir
      );

      if (mcpackFiles.length === 0) {
        // No inner .mcpack files — addon uses folder structure directly, process as-is
        console.log(`[PROCESSOR] ${filename}: no inner .mcpack files, processing as single pack`);
        packsToProcess.push({ zip: outerZip, sourceName: filename });
      } else {
        for (const [packName, packFile] of mcpackFiles) {
          try {
            const packBuffer = await packFile.async("nodebuffer");
            const packZip = await JSZip.loadAsync(packBuffer);
            packsToProcess.push({ zip: packZip, sourceName: filename });
          } catch (err) {
            console.error(`[PROCESSOR] Failed to open inner pack ${packName}:`, err);
            onLog(`❌ ${filename}: could not read inner pack file.`, "error");
          }
        }
      }
    } else {
      packsToProcess.push({ zip: outerZip, sourceName: filename });
    }

    for (const { zip, sourceName } of packsToProcess) {
      const packs = await extractPacks(zip);
      if (packs.length === 0) {
        console.warn(`[PROCESSOR] No manifest.json found in ${sourceName}`);
        onLog(`❌ ${sourceName} — no valid manifest.json found.`, "error");
        results.push({ name: sourceName, sourceName, status: "error", error: "No manifest.json found." });
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
      console.warn(`[PROCESSOR] "${packName}" has no UUID in manifest`);
      onLog(`❌ ${packName} — no UUID in manifest, skipping.`, "error");
      results.push({ name: packName, sourceName, status: "error", error: "No UUID in manifest." });
      continue;
    }

    const resolution = resolveInstallStatus(packUuid, packVersion, installedMap);

    // Verbose info to PM2 logs only
    console.log(`[PROCESSOR] "${packName}" | type: ${packType} | uuid: ${packUuid} | version: ${packVersion.join(".")} | status: ${resolution.status}`);

    // ── Skip ────────────────────────────────────────────────────────────────
    if (resolution.status === "skip") {
      onLog(`⚠ ${packName} — ${resolution.reason}`, "warn");
      results.push({ name: packName, sourceName, type: packType, uuid: packUuid, status: "skip", reason: resolution.reason });
      continue;
    }

    const isUpdate = resolution.status === "update";

    // ── Deploy (install or update) ───────────────────────────────────────────
    const deploy = async (subfolder, worldJsonFile) => {
      const destDir = `${worldPath}/${subfolder}/${packName}`;
      const packFolderParent = `${worldPath}/${subfolder}`;
      const typeLabel = subfolder === "resource_packs" ? "resource" : "behavior";

      if (isUpdate) {
        console.log(`[PROCESSOR] Removing old ${packFolderParent}/${packName} before update`);
        try {
          await api.deletePackFolder(packFolderParent, packName);
        } catch (err) {
          console.error(`[PROCESSOR] Failed to delete old pack folder:`, err);
          onLog(`❌ ${packName}: could not remove old ${typeLabel} pack folder.`, "error");
          throw err;
        }
      }

      await uploadPackFiles(api, files, destDir);

      const jsonPath = `${worldPath}/${worldJsonFile}`;
      if (isUpdate) {
        await api.updatePackVersion(jsonPath, packUuid, packVersion);
        onLog(`✔ ${packName} — ${typeLabel} pack updated`, "success");
      } else {
        await api.registerPack(jsonPath, packUuid, packVersion);
        onLog(`✔ ${packName} — ${typeLabel} pack installed`, "success");
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
        console.warn(`[PROCESSOR] Unknown pack type for "${packName}" — skipping`);
        onLog(`⚠ ${packName} — could not determine pack type, skipping.`, "warn");
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
      console.error(`[PROCESSOR] Deploy failed for "${packName}":`, err);
      onLog(`❌ ${packName} — deployment failed.`, "error");
      results.push({ name: packName, sourceName, status: "error", error: "Deployment failed. Check server logs." });
    }
  }

  return results;
}

/**
 * Strip common BP/RP/BH/RH suffix patterns from a pack name for grouping.
 * e.g. "MyCoolPack_BP" → "MyCoolPack", "MyCoolPack_RP" → "MyCoolPack"
 */
function normalizeAddonName(name) {
  return name
    .replace(/[_\-\s]*(BP|RP|BH|RH|Behavior|Resource|behavior|resource)$/i, "")
    .replace(/[_\-\s]+$/, "")
    .trim();
}

/**
 * Fetch all installed addons from the server.
 * 
 * Flow:
 *  1. Read both world JSON files to get registered UUIDs
 *  2. List folders in resource_packs/ and behavior_packs/ inside the world
 *  3. Read each folder's manifest.json to get name and UUID
 *  4. Match folders to JSON entries by UUID
 *  5. Group resource + behavior packs by normalized name into unified addon entries
 *
 * Returns array of:
 * {
 *   name: string,           — display name
 *   resource: { uuid, version, folder } | null,
 *   behavior: { uuid, version, folder } | null,
 * }
 */
export async function fetchInstalledAddons(api, worldPath = "worlds/default") {
  // Step 1: Read both world JSONs
  const [resourceEntries, behaviorEntries] = await Promise.all([
    api.readPackJson(`${worldPath}/world_resource_packs.json`),
    api.readPackJson(`${worldPath}/world_behavior_packs.json`),
  ]);

  const resourceUuids = new Map(resourceEntries.map(e => [e.pack_id, e.version]));
  const behaviorUuids = new Map(behaviorEntries.map(e => [e.pack_id, e.version]));

  // Step 2: List folders
  const [resourceFolders, behaviorFolders] = await Promise.all([
    api.listFiles(`${worldPath}/resource_packs`),
    api.listFiles(`${worldPath}/behavior_packs`),
  ]);

  // Step 3: Read manifest from each folder and match to JSON entry
  const readPackInfo = async (folders, parentPath, uuidMap, type) => {
    const packs = [];
    for (const folder of folders.filter(f => !f.is_file)) {
      try {
        const manifestPath = `${parentPath}/${folder.name}/manifest.json`;
        const raw = await api.readFile(manifestPath);
        const manifest = JSON.parse(raw);
        const uuid = manifest?.header?.uuid ?? "";
        const name = manifest?.header?.name ?? folder.name;
        const version = manifest?.header?.version ?? [0, 0, 1];

        if (uuid && uuidMap.has(uuid)) {
          packs.push({ uuid, name, version, folder: folder.name, type });
        } else {
          // Folder exists but not in JSON — orphaned folder, still show it
          packs.push({ uuid, name, version, folder: folder.name, type, orphaned: true });
        }
      } catch (err) {
        console.warn(`[FETCH] Could not read manifest for ${parentPath}/${folder.name}:`, err.message);
        // Include folder even without manifest
        packs.push({ uuid: null, name: folder.name, version: null, folder: folder.name, type, orphaned: true });
      }
    }
    return packs;
  };

  const [resourcePacks, behaviorPacks] = await Promise.all([
    readPackInfo(resourceFolders, `${worldPath}/resource_packs`, resourceUuids, "resource"),
    readPackInfo(behaviorFolders, `${worldPath}/behavior_packs`, behaviorUuids, "behavior"),
  ]);

  // Step 4: Group by normalized name
  const addonMap = new Map();

  const addToMap = (pack) => {
    const key = normalizeAddonName(pack.name).toLowerCase();
    if (!addonMap.has(key)) {
      addonMap.set(key, { name: normalizeAddonName(pack.name), resource: null, behavior: null });
    }
    const entry = addonMap.get(key);
    entry[pack.type] = { uuid: pack.uuid, version: pack.version, folder: pack.folder, orphaned: pack.orphaned };
    // Use the cleaner name (prefer the one without BP/RP suffix)
    if (pack.name.length < entry.name.length + 3) {
      entry.name = normalizeAddonName(pack.name);
    }
  };

  for (const pack of [...resourcePacks, ...behaviorPacks]) addToMap(pack);

  return Array.from(addonMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}
