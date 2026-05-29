import axios from "axios";
import FormData from "form-data";

/**
 * Detect which panel the API key belongs to based on its prefix.
 * - ptlc_ → Pterodactyl (client key)
 * - ptla_ → Pterodactyl (application key — wrong type, warn user)
 * - pacc_ → Pelican (client key)
 * Returns "pelican", "pterodactyl", or "unknown"
 */
export function detectPanel(apiKey) {
  if (apiKey.startsWith("pacc_")) return "pelican";
  if (apiKey.startsWith("ptlc_")) return "pterodactyl";
  if (apiKey.startsWith("ptla_")) return "pterodactyl-app"; // application key, not client
  return "unknown";
}

/**
 * Extract a meaningful error message from an axios error,
 * including the HTTP status and response body if available.
 */
function axiosError(context, err) {
  const status = err.response?.status ?? "no response";
  const body = err.response?.data
    ? JSON.stringify(err.response.data)
    : err.message;
  return new Error(`[${context}] HTTP ${status}: ${body}`);
}

/**
 * Pelican & Pterodactyl Client API handler.
 * Both panels share an identical REST API surface for client endpoints —
 * the only difference is the API key prefix (pacc_ vs ptlc_).
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
        // Both Pelican and Pterodactyl accept this header
        Accept: "Application/vnd.pterodactyl.v1+json",
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Read a file's contents from the server
   * @param {string} filePath - e.g. "worlds/default/world_resource_packs.json"
   */
  async readFile(filePath) {
    const res = await this.client.get("/files/contents", {
      params: { file: filePath },
      transformResponse: [(data) => data], // keep as raw text
    });
    return res.data;
  }

  /**
   * Write content directly to a file (creates or overwrites)
   * @param {string} filePath - e.g. "worlds/default/world_resource_packs.json"
   * @param {string} content  - file content as a string
   */
  async writeFile(filePath, content) {
    await this.client.post("/files/write", content, {
      params: { file: filePath },
      headers: { "Content-Type": "text/plain" },
    });
  }

  /**
   * Create a directory on the server
   * @param {string} dirPath - e.g. "worlds/default/resource_packs/MyCoolPack"
   */
  async createDirectory(dirPath) {
    await this.client.post("/files/create-folder", {
      root: "/",
      name: dirPath,
    });
  }

  /**
   * Get a signed upload URL, then upload a file buffer to it.
   *
   * The directory is NOT passed when requesting the signed URL —
   * it must be appended to the signed URL itself before uploading.
   * This is how the Pelican/Pterodactyl web client actually does it,
   * and avoids the bug where files land in root instead of the target dir.
   *
   * @param {string} directory  - target dir e.g. "worlds/default/resource_packs/MyCoolPack"
   * @param {string} filename   - file name e.g. "manifest.json"
   * @param {Buffer} buffer     - file content as a Buffer
   * @param {string} mimeType   - e.g. "application/json"
   */
  async uploadFile(directory, filename, buffer, mimeType = "application/octet-stream") {
    const dir = "/" + directory.replace(/^\//, "");

    // Step 1: Get the signed URL — no directory param here
    let signedUrl;
    try {
      const { data } = await this.client.get("/files/upload");
      signedUrl = data.attributes.url;
    } catch (err) {
      throw axiosError(`get upload URL for ${dir}/${filename}`, err);
    }

    // Step 2: Append directory to the signed URL, then POST the file
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
      throw axiosError(`upload ${dir}/${filename} to Wings`, err);
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
   * Add a pack entry to a world JSON file if not already present.
   * @param {string} filePath  - e.g. "worlds/default/world_resource_packs.json"
   * @param {string} packUuid
   * @param {number[]} version - e.g. [1, 0, 0]
   * @returns {boolean} true if a new entry was added
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
   * Send a command to the server console
   */
  async sendCommand(command) {
    await this.client.post("/command", { command });
  }

  /**
   * Restart the server
   */
  async restartServer() {
    await this.client.post("/power", { signal: "restart" });
  }
}
