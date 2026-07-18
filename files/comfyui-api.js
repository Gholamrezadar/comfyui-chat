/**
 * comfyui-api.js — A zero-dependency JavaScript client for the ComfyUI local API.
 *
 * Handles:
 *   - WebSocket connection and automatic reconnection
 *   - Binary preview frame parsing (JPEG/PNG)
 *   - JSON message parsing and typed event dispatch
 *   - HTTP API calls: submit prompt, interrupt, fetch history, build image URLs
 *
 * Does NOT handle:
 *   - UI updates, logging, timers, workflow editing
 *   - The caller is responsible for preparing workflow JSON before submission.
 *
 * Usage:
 *   const client = new ComfyUIClient('http://127.0.0.1:8188');
 *   client.on('connected', () => console.log('connected'));
 *   client.on('preview', (url) => img.src = url);
 *   client.on('done', (promptId) => { ... });
 *   await client.connect();
 *   const result = await client.submitPrompt(workflowObject);
 *   // later: await client.interrupt();
 *
 * See COMFYUI-API-LIB.md for full reference.
 */

class ComfyUIClient {
  /**
   * @param {string} serverUrl — ComfyUI HTTP address, e.g. "http://127.0.0.1:8188"
   */
  constructor(serverUrl) {
    /** @private */ this._serverUrl = serverUrl.replace(/\/+$/, '');
    /** @private */ this._clientId = ComfyUIClient.generateUUID();
    /** @private */ this._ws = null;
    /** @private */ this._listeners = {};
    /** @private */ this._lastPreviewUrl = null;
    /** @private */ this._frameCount = 0;
  }

  // ── Public read-only properties ──────────────────────────────────────────

  /** The auto-generated UUID for this client instance. */
  get clientId() { return this._clientId; }

  /** Current server URL. */
  get serverUrl() { return this._serverUrl; }

  /** Whether the WebSocket is currently open. */
  get isConnected() { return this._ws?.readyState === WebSocket.OPEN; }

  /**
   * Update the server URL. Disconnects first if currently connected.
   * Does not auto-reconnect — call connect() after this.
   * @param {string} url
   */
  setServerUrl(url) {
    this.disconnect();
    this._serverUrl = url.replace(/\/+$/, '');
  }

  // ── Event system ─────────────────────────────────────────────────────────

  /**
   * Register a callback for an event.
   *
   * Events:
   *   "connected"    — ()                   WebSocket opened
   *   "disconnected" — ()                   WebSocket closed
   *   "error"        — (msg: string)        Connection or execution error
   *   "status"       — (queueRemaining)     Queue position update
   *   "start"        — (promptId)           Execution began
   *   "cached"       — (nodeCount)          Cached nodes reused
   *   "executing"    — (nodeId)             A node started executing
   *   "progress"     — (value, max, pct)    Sampler progress (pct is 0-100)
   *   "executed"     — (nodeId, images)     A node finished (images may be [])
   *   "done"         — (promptId)           All nodes finished
   *   "preview"      — (blobUrl)           Live preview image ready to display
   *   "history"      — (promptId, outputs)  History fetched after execution
   *   "error:exec"   — (message)            Server-side execution error
   *
   * @param {string} event
   * @param {Function} callback
   */
  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
    return this; // allow chaining
  }

  /** Remove a specific callback, or all callbacks for an event. */
  off(event, callback) {
    if (!callback) { this._listeners[event] = []; return this; }
    const list = this._listeners[event];
    if (list) this._listeners[event] = list.filter(fn => fn !== callback);
    return this;
  }

  /** @private */
  _emit(event, ...args) {
    (this._listeners[event] || []).forEach(fn => {
      try { fn(...args); } catch (e) { console.error(`[ComfyUIClient] error in "${event}" handler:`, e); }
    });
  }

  // ── Connection ───────────────────────────────────────────────────────────

  /**
   * Open a WebSocket connection to the ComfyUI server.
   * Resolves once the socket is open, or rejects on failure.
   * @returns {Promise<void>}
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this._ws) {
        this._ws.onclose = null;
        this._ws.close();
      }

      const wsUrl = this._serverUrl.replace(/^http/, 'ws') + `/ws?clientId=${this._clientId}`;
      this._ws = new WebSocket(wsUrl);
      this._ws.binaryType = 'arraybuffer';

      this._ws.onopen = () => {
        this._emit('connected');
        resolve();
      };

      this._ws.onerror = () => {
        this._emit('error', 'WebSocket connection error');
        reject(new Error('WebSocket connection failed'));
      };

      this._ws.onclose = () => {
        this._emit('disconnected');
      };

      this._ws.onmessage = (event) => this._handleMessage(event);
    });
  }

  /** Close the WebSocket connection. */
  disconnect() {
    if (this._ws) {
      this._ws.onclose = null;
      this._ws.close();
      this._ws = null;
    }
  }

  // ── Message handling ─────────────────────────────────────────────────────

  /** @private — route incoming WebSocket messages. */
  _handleMessage(event) {
    // Binary frames are preview images
    if (event.data instanceof ArrayBuffer) {
      this._handleBinaryFrame(event.data);
      return;
    }
    if (event.data instanceof Blob) {
      event.data.arrayBuffer().then(buf => this._handleBinaryFrame(buf));
      return;
    }

    // Text frames are JSON events
    if (typeof event.data !== 'string') return;
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }

    const { type, data } = msg;

    switch (type) {
      case 'status': {
        const q = data?.status?.exec_info?.queue_remaining;
        if (q !== undefined) this._emit('status', q);
        break;
      }
      case 'execution_start':
        this._emit('start', data.prompt_id);
        break;
      case 'execution_cached':
        this._emit('cached', data.nodes?.length ?? 0);
        break;
      case 'executing':
        if (data.node === null) {
          this._emit('done', data.prompt_id);
        } else {
          this._emit('executing', String(data.node));
        }
        break;
      case 'progress': {
        const pct = Math.round((data.value / data.max) * 100);
        this._emit('progress', data.value, data.max, pct);
        break;
      }
      case 'executed': {
        const images = data?.output?.images ?? [];
        this._emit('executed', String(data.node), images);
        break;
      }
      case 'execution_error':
        this._emit('error:exec', data.exception_message);
        break;
    }
  }

  // ── Binary frame parsing (preview images) ────────────────────────────────

  /**
   * Parse a binary WebSocket frame and emit "preview" with a blob URL.
   *
   * ComfyUI binary frame formats:
   *   Standard: [4B frame type BE][4B image_type BE][image bytes]
   *     frame type = 1 → preview
   *     image_type = 1 → JPEG, 2 → PNG
   *   Fallback:  [1B type][3B padding][image bytes with magic-byte detection]
   *
   * @private
   */
  _handleBinaryFrame(buffer) {
    this._frameCount++;
    if (buffer.byteLength < 4) return;

    const view = new DataView(buffer);

    // Standard format: 4-byte big-endian frame type
    const frameType = view.getUint32(0, false);
    if (frameType === 1) {
      if (buffer.byteLength < 8) return;
      const imageType = view.getUint32(4, false);
      const mime = imageType === 1 ? 'image/jpeg' : 'image/png';
      const imageBytes = buffer.slice(8);
      this._emitPreview(imageBytes, mime);
      return;
    }

    // Fallback: first byte = type, bytes 4+ = image data with magic-byte sniffing
    const firstByte = view.getUint8(0);
    if (firstByte === 1 && buffer.byteLength > 4) {
      const imageBytes = buffer.slice(4);
      const peek = new Uint8Array(imageBytes, 0, Math.min(4, imageBytes.byteLength));
      let mime;
      if (peek[0] === 0x89 && peek[1] === 0x50 && peek[2] === 0x4E && peek[3] === 0x47) {
        mime = 'image/png';
      } else if (peek[0] === 0xFF && peek[1] === 0xD8 && peek[2] === 0xFF) {
        mime = 'image/jpeg';
      } else {
        return; // not a recognized image
      }
      this._emitPreview(imageBytes, mime);
    }
  }

  /** @private — create a blob URL and emit "preview". */
  _emitPreview(imageBytes, mime) {
    const blob = new Blob([imageBytes], { type: mime });
    const url = URL.createObjectURL(blob);
    if (this._lastPreviewUrl) URL.revokeObjectURL(this._lastPreviewUrl);
    this._lastPreviewUrl = url;
    this._emit('preview', url);
  }

  /** Revoke the last preview blob URL to free memory. */
  revokePreview() {
    if (this._lastPreviewUrl) {
      URL.revokeObjectURL(this._lastPreviewUrl);
      this._lastPreviewUrl = null;
    }
  }

  // ── HTTP API ─────────────────────────────────────────────────────────────

  /**
   * Submit a workflow to the ComfyUI /prompt endpoint.
   * The caller must prepare the workflow object (JSON-parsed, prompt injected).
   *
   * @param {Object} workflow — Parsed workflow JSON (node-id keyed object)
   * @returns {Promise<{promptId: string, number: number}>}
   * @throws {Error} On server error or network failure
   */
  async submitPrompt(workflow) {
    const resp = await fetch(`${this._serverUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow, client_id: this._clientId }),
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);

    const result = await resp.json();

    if (result.error) {
      const err = new Error(`Server error: ${result.error}`);
      err.nodeErrors = result.node_errors;
      throw err;
    }

    return { promptId: result.prompt_id, number: result.number };
  }

  /**
   * Cancel the currently running prompt.
   * @returns {Promise<void>}
   */
  async interrupt() {
    await fetch(`${this._serverUrl}/interrupt`, { method: 'POST' });
  }

  /**
   * Fetch execution history for a prompt.
   * @param {string} promptId
   * @returns {Promise<Object>} The history entry for this prompt (or empty object)
   */
  async fetchHistory(promptId) {
    const resp = await fetch(`${this._serverUrl}/history/${promptId}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    const data = await resp.json();
    return data[promptId] ?? {};
  }

  /**
   * Build a /view URL for an output image.
   * @param {string} filename
   * @param {string} [subfolder='']
   * @param {string} [type='output']
   * @returns {string}
   */
  getImageUrl(filename, subfolder = '', type = 'output') {
    const params = new URLSearchParams({ filename, subfolder, type });
    return `${this._serverUrl}/view?${params}`;
  }

  /**
   * Collect all output images from a history entry's outputs.
   * @param {Object} historyEntry — The value from history[promptId]
   * @returns {Array<{filename: string, subfolder: string, type: string, nodeId: string}>}
   */
  collectOutputImages(historyEntry) {
    const outputs = historyEntry?.outputs ?? {};
    const images = [];
    for (const [nodeId, nodeOut] of Object.entries(outputs)) {
      for (const img of (nodeOut.images ?? [])) {
        images.push({ ...img, nodeId });
      }
    }
    return images;
  }

  // ── Utilities (static) ───────────────────────────────────────────────────

  /**
   * Generate a UUID v4 (does not require crypto.randomUUID).
   * @returns {string}
   */
  static generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  /**
   * Format milliseconds as a compact duration string.
   * Examples: "0s", "45s", "2m 15s"
   * @param {number} ms
   * @returns {string}
   */
  static fmtDuration(ms) {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  }

  /**
   * Build a human-readable log line from a typed event, for debugging.
   * Returns null for events that don't need logging.
   *
   * @param {string} event — Event name
   * @param  {...any} args — Event arguments
   * @returns {{msg: string, style: string} | null}
   */
  static formatEventLog(event, ...args) {
    const styleMap = {
      'connected': 'success',
      'disconnected': '',
      'error': 'error',
      'error:exec': 'error',
      'start': 'accent',
      'cached': 'warning',
      'done': 'success',
      'preview': 'accent',
      'executing': '',
      'progress': '',
      'executed': 'success',
      'status': '',
    };
    const style = styleMap[event] ?? '';

    switch (event) {
      case 'connected':    return { msg: 'WebSocket connected', style };
      case 'disconnected': return { msg: 'WebSocket disconnected', style };
      case 'error':        return { msg: `error: ${args[0]}`, style };
      case 'error:exec':   return { msg: `execution error: ${args[0]}`, style };
      case 'start':        return { msg: `execution started — prompt: ${args[0]}`, style };
      case 'cached':       return { msg: `using cached results for ${args[0]} nodes`, style };
      case 'done':         return { msg: 'all nodes executed', style };
      case 'preview':      return { msg: 'preview frame received', style };
      case 'executing':    return { msg: `executing node: ${args[0]}`, style };
      case 'progress':     return { msg: `progress: ${args[0]}/${args[1]} (${args[2]}%)`, style };
      case 'executed':     return args[1].length
        ? { msg: `node ${args[0]} produced ${args[1].length} image(s)`, style }
        : null;
      case 'status':       return { msg: `queue remaining: ${args[0]}`, style };
      default:             return null;
    }
  }
}

// Export for both module and script-tag usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ComfyUIClient };
}
