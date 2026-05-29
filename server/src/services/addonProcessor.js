import JSZip from "jszip";

const PACK_TYPE_MAP = {
  resources: "resource",
  data: "behavior",
  script: "behavior",
  javascript: "behavior",
  skin_pack: "resource",
  world_template: "resource",
};

/**
 * Detect pack type from a parsed manifest.json
 * Returns "resource", "behavior", "both", or "unknown"
 */
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
 * Find all manifest.json files inside a JSZip instance.
 * Returns array of { manifest, files } where files is a map of
 * relative paths → JSZip file objects within that pack's folder.
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
      console.warn(`Skipping malformed manifest at ${path}`);
      continue;
    }

    // Get the directory prefix of this manifest (the pack root)
    const packRoot = path.substring(0, path.lastIndexOf("manifest.json"));

    // Collect all files under this pack root
    const packFiles = {};
    for (const [filePath, zipFile] of Object.entries(zip.files)) {
      if (filePath.startsWith(packRoot) && !zipFile.dir) {
        // Strip the pack root prefix so paths are relative to pack folder
        const relativePath = filePath.substring(packRoot.length);
        packFiles[relativePath] = zipFile;
      }
    }

    packs.push({ manifest, files: packFiles, packRoot });
  }

  return packs;
}

/**
 * Main processor — takes a file buffer (.mcaddon or .mcpack),
 * extracts all packs, uploads them to the server via the Pelican API,
 * and registers them in the world JSON files.
 *
 * @param {Buffer} buffer           - The addon file buffer
 * @param {string} filename         - Original filename (to detect .mcaddon vs .mcpack)
 * @param {PelicanAPI} api          - Initialized PelicanAPI instance
 * @param {string} worldPath        - e.g. "worlds/default"
 * @param {object} options
 * @param {Function} options.onLog  - Callback for progress logs (msg, type)
 * @returns {object[]} Array of result objects per pack
 */
export async function processAddon(buffer, filename, api, worldPath = "worlds/default", { onLog = () => {} } = {}) {
  const results = [];
  const isMcAddon = filename.toLowerCase().endsWith(".mcaddon");

  onLog(`📦 Reading ${filename}...`, "info");
  const outerZip = await JSZip.loadAsync(buffer);

  let packsToProcess = [];

  if (isMcAddon) {
    // .mcaddon is a zip of .mcpack zips
    const mcpackFiles = Object.entries(outerZip.files).filter(
      ([name, f]) => name.toLowerCase().endsWith(".mcpack") && !f.dir
    );

    if (mcpackFiles.length === 0) {
      // Some .mcaddon files are actually just a single pack directly
      onLog("No .mcpack files found inside, treating as single pack.", "warn");
      packsToProcess.push({ zip: outerZip, sourceName: filename });
    } else {
      for (const [packName, packFile] of mcpackFiles) {
        const packBuffer = await packFile.async("nodebuffer");
        const packZip = await JSZip.loadAsync(packBuffer);
        packsToProcess.push({ zip: packZip, sourceName: packName });
      }
    }
  } else {
    // Single .mcpack
    packsToProcess.push({ zip: outerZip, sourceName: filename });
  }

  for (const { zip, sourceName } of packsToProcess) {
    onLog(`\n🔍 Processing: ${sourceName}`, "info");
    const packs = await extractPacks(zip);

    if (packs.length === 0) {
      onLog(`No valid manifest.json found in ${sourceName}`, "error");
      results.push({ name: sourceName, success: false, error: "No manifest found" });
      continue;
    }

    for (const { manifest, files } of packs) {
      const header = manifest?.header ?? {};
      const packUuid = header.uuid ?? "";
      const packVersion = header.version ?? [0, 0, 1];
      const packName = (header.name ?? sourceName).replace(/\s+/g, "_");
      const packType = detectPackType(manifest);

      if (!packUuid) {
        onLog(`❌ No UUID in manifest for ${packName}, skipping.`, "error");
        results.push({ name: packName, success: false, error: "No UUID" });
        continue;
      }

      onLog(`📋 Pack: "${packName}" | Type: ${packType} | UUID: ${packUuid.slice(0, 8)}…`, "info");

      const deploy = async (destFolder, worldJsonFile) => {
        const dir = `${destFolder}/${packName}`;
        onLog(`  → Uploading files to ${dir}/`, "info");

        // Upload every file in the pack
        for (const [relativePath, zipFile] of Object.entries(files)) {
          const fileBuffer = await zipFile.async("nodebuffer");
          const fileDir = relativePath.includes("/")
            ? `${dir}/${relativePath.substring(0, relativePath.lastIndexOf("/"))}`
            : dir;
          const fileName = relativePath.split("/").pop();

          try {
            await api.uploadFile(fileDir, fileName, fileBuffer);
          } catch (err) {
            onLog(`    ❌ ${relativePath}: ${err.message}`, "error");
            throw err; // stop this pack's deploy on first failure
          }
        }

        onLog(`  ✔ Files uploaded`, "success");

        // Register in world JSON
        const jsonPath = `${worldPath}/${worldJsonFile}`;
        const added = await api.registerPack(jsonPath, packUuid, packVersion);
        if (added) {
          onLog(`  ✔ Registered in ${worldJsonFile}`, "success");
        } else {
          onLog(`  ⚠ Already in ${worldJsonFile}, skipped`, "warn");
        }
      };

      try {
        if (packType === "resource" || packType === "both") {
          await deploy(`${worldPath}/resource_packs`, "world_resource_packs.json");
        }
        if (packType === "behavior" || packType === "both") {
          await deploy(`${worldPath}/behavior_packs`, "world_behavior_packs.json");
        }
        if (packType === "unknown") {
          onLog(`  ⚠ Unknown pack type, skipping deployment`, "warn");
        }

        results.push({ name: packName, type: packType, uuid: packUuid, success: true });
      } catch (err) {
        onLog(`  ❌ Failed: ${err.message}`, "error");
        results.push({ name: packName, success: false, error: err.message });
      }
    }
  }

  return results;
}
