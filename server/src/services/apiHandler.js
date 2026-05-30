import axios from "axios";
import FormData from "form-data";

/**
 * Detect which panel the API key belongs to based on its prefix.
 * - ptlc_ → Pterodactyl (client key)
 * - ptla_ → Pterodactyl (application key — wrong type, warn user)
 * - pacc_ → Pelican (client key)
 * Returns "pelican", "pterodactyl", "pterodactyl-app", or "unknown"
 */
export function detectPanel(apiKey) {
  if (apiKey.startsWith("pacc_")) return "pelican";
  if (apiKey.startsWith("ptlc_")) return "pterodactyl";
  if (apiKey.startsWith("ptla_")) return "pterodactyl-app";
  return "unknown";
}

/**
 * Compare two version arrays e.g. [1,0,0] vs [1,1,0]
 * Returns:
 *   1  if a > b (incoming is newer)
 *   0  if a === b
 *  -1  if a < b (incoming is older or same)
 */
export function compareVersions(a, b) {
  for (let i = 0; i < 3; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

/**
 * Log an axios error to server console (not forwarded to client).
 */
function logAxiosError(context, err) {
  const status = err.response?.status ?? "no response";
  const body = err.response?.data ? JSON.stringify(err.response.data) : err.message;
  console.error(`[API ERROR] ${context} — HTTP ${status}: ${body}`);
}

/**
 * Pelican & Pterodactyl Client API handler.
 * Both panels share an identical REST API surface for client endpoints.
 * All paths are relative to the container root (what you see in the file manager).
 */
export class PanelAPI {
  constructor(panelUrl, apiKey, serverId) {
    this.serverId = serverId;
    this.panelType = detectPanel(apiKey);

    this.client = axios.create({
      baseURL: `${panelUrl.replace(/\/$/, "")}/api/client/servers/${serverId}`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "Application/vnd.pterodactyl.v1+json",
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Read a file's raw text contents from the server.
   */
  async readFile(filePath) {
    const res = await this.client.get("/files/contents", {
      params: { file: filePath },
      transformResponse: [(data) => data],
    });
    return res.data;
  }

  /**
   * Write content directly to a file (creates or overwrites).
   */
  async writeFile(filePath, content) {
    await this.client.post("/files/write", content, {
      params: { file: filePath },
      headers: { "Content-Type": "text/plain" },
    });
  }

  /**
   * Delete a list of files/folders on the server.
   * @param {string} root - root directory e.g. "/"
   * @param {string[]} files - list of paths relative to root
   */
  async deleteFiles(root, files) {
    await this.client.post("/files/delete", { root, files });
  }

  /**
   * Delete a pack folder from the server.
   * e.g. deletePackFolder("worlds/default/resource_packs", "MyCoolPack")
   */
  async deletePackFolder(parentDir, packName) {
    try {
      await this.deleteFiles("/" + parentDir.replace(/^\//, ""), [packName]);
    } catch (err) {
      logAxiosError(`delete pack folder ${parentDir}/${packName}`, err);
      throw new Error(`Failed to delete old pack folder before update.`);
    }
  }

  /**
   * Upload a file buffer to the server using a signed URL.
   * Directory is appended to the signed URL (not the GET request) to avoid the Wings bug.
   */
  async uploadFile(directory, filename, buffer, mimeType = "application/octet-stream") {
    const dir = "/" + directory.replace(/^\//, "");

    let signedUrl;
    try {
      const { data } = await this.client.get("/files/upload");
      signedUrl = data.attributes.url;
    } catch (err) {
      logAxiosError(`get upload URL for ${dir}/${filename}`, err);
      throw new Error(`Could not get upload URL. Check your panel URL, API key, and server ID.`);
    }

    const uploadUrl = `${signedUrl}&directory=${encodeURIComponent(dir)}`;
    const form = new FormData();
    form.append("files", buffer, { filename, contentType: mimeType });

    try {
      await axios.post(uploadUrl, form, {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
    } catch (err) {
      logAxiosError(`upload ${dir}/${filename}`, err);
      throw new Error(`Failed to upload ${filename}. The server may be offline or unreachable.`);
    }
  }

  /**
   * Read and parse a world pack JSON file.
   * Returns an empty array if the file doesn't exist yet.
   */
  async readPackJson(filePath) {
    try {
      const raw = await this.readFile(filePath);
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Poll both world JSON files and return a map of UUID → { version, type }
   * so the processor can compare before uploading anything.
   * type is "resource", "behavior", or "both" based on which JSONs it appears in.
   */
  async pollInstalledPacks(worldPath) {
    const [resourceEntries, behaviorEntries] = await Promise.all([
      this.readPackJson(`${worldPath}/world_resource_packs.json`),
      this.readPackJson(`${worldPath}/world_behavior_packs.json`),
    ]);

    const installed = new Map();

    for (const entry of resourceEntries) {
      installed.set(entry.pack_id, { version: entry.version, type: "resource" });
    }
    for (const entry of behaviorEntries) {
      const existing = installed.get(entry.pack_id);
      if (existing) {
        existing.type = "both";
      } else {
        installed.set(entry.pack_id, { version: entry.version, type: "behavior" });
      }
    }

    return installed;
  }

  /**
   * Register a new pack entry in the world JSON.
   */
  async registerPack(filePath, packUuid, version) {
    const entries = await this.readPackJson(filePath);
    const exists = entries.some((e) => e.pack_id === packUuid);
    if (exists) return false;
    entries.push({ pack_id: packUuid, version });
    await this.writeFile(filePath, JSON.stringify(entries, null, 2));
    return true;
  }

  /**
   * Update the version of an existing pack entry in the world JSON.
   */
  async updatePackVersion(filePath, packUuid, newVersion) {
    const entries = await this.readPackJson(filePath);
    const entry = entries.find((e) => e.pack_id === packUuid);
    if (!entry) return false;
    entry.version = newVersion;
    await this.writeFile(filePath, JSON.stringify(entries, null, 2));
    return true;
  }

  /**
   * List files/folders in a directory.
   * Returns array of { name, is_file } objects.
   */
  async listFiles(directory) {
    try {
      const res = await this.client.get("/files/list", {
        params: { directory: "/" + directory.replace(/^\//, "") },
      });
      return res.data.data.map(f => ({
        name: f.attributes.name,
        is_file: f.attributes.is_file,
      }));
    } catch (err) {
      logAxiosError(`list files in ${directory}`, err);
      return [];
    }
  }

  /**
   * Remove a pack entry from a world JSON file by UUID.
   */
  async removePackEntry(filePath, packUuid) {
    const entries = await this.readPackJson(filePath);
    const filtered = entries.filter(e => e.pack_id !== packUuid);
    if (filtered.length === entries.length) return false; // wasn't there
    await this.writeFile(filePath, JSON.stringify(filtered, null, 2));
    return true;
  }

  /**
   * Restart the server.
   */
  async restartServer() {
    await this.client.post("/power", { signal: "restart" });
  }
}
