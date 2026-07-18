# ComfyUI API JS Library

**File:** `comfyui-api.js`
**Dependencies:** None (vanilla JS, works in browser via `<script>` tag)
**Target:** Local ComfyUI server (default `http://127.0.0.1:8188`)

## What This Library Does

A zero-dependency JS client for the ComfyUI local API. It handles WebSocket connection, binary preview image parsing, JSON event dispatch, and HTTP API calls. It does NOT handle UI, logging, timers, or workflow editing.

## Quick Start

```html
<script src="comfyui-api.js"></script>
<script>
  const client = new ComfyUIClient('http://127.0.0.1:8188');

  client.on('connected', () => console.log('connected'));
  client.on('preview', (url) => document.getElementById('img').src = url);
  client.on('done', (promptId) => console.log('done', promptId));
  client.on('error', (msg) => console.error(msg));

  await client.connect();
  const { promptId } = await client.submitPrompt(workflowObject);
</script>
```

## Constructor

```js
const client = new ComfyUIClient(serverUrl);
```

| Param | Type | Description |
|-------|------|-------------|
| `serverUrl` | `string` | ComfyUI HTTP address, e.g. `"http://127.0.0.1:8188"` |

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `client.clientId` | `string` | Auto-generated UUID for this instance |
| `client.serverUrl` | `string` | Current server URL |
| `client.isConnected` | `boolean` | Whether WebSocket is open |

## Methods

### `setServerUrl(url)`
Update the server URL. Disconnects first if currently connected. Does not auto-reconnect — call `connect()` after.

```js
client.setServerUrl('http://192.168.1.100:8188');
await client.connect();
```

### `connect()` → `Promise<void>`
Opens WebSocket. Resolves when open, rejects on failure.

### `disconnect()`
Closes WebSocket.

### `submitPrompt(workflow)` → `Promise<{promptId, number}>`
POST the workflow object to `/prompt`. The caller must parse the workflow JSON and inject user inputs before calling this.

| Param | Type | Description |
|-------|------|-------------|
| `workflow` | `Object` | Parsed workflow JSON (node-id → node object map) |

Throws `Error` with `.nodeErrors` property on server validation errors.

### `interrupt()` → `Promise<void>`
POST to `/interrupt` to cancel the running prompt.

### `fetchHistory(promptId)` → `Promise<Object>`
GET `/history/{promptId}`. Returns the history entry for that prompt.

### `getImageUrl(filename, subfolder?, type?)` → `string`
Builds a `/view` URL for an output image.

### `collectOutputImages(historyEntry)` → `Array<{filename, subfolder, type, nodeId}>`
Extracts all image outputs from a history entry.

### `revokePreview()`
Revoke the last preview blob URL to free memory.

### `on(event, callback)` → `this`
Register an event callback. Returns `this` for chaining.

### `off(event, callback?)` → `this`
Remove a callback (or all callbacks for an event).

## Events

Register with `client.on(eventName, callback)`:

| Event | Callback Args | When |
|-------|--------------|------|
| `connected` | `()` | WebSocket opened |
| `disconnected` | `()` | WebSocket closed |
| `error` | `(msg)` | Connection error |
| `error:exec` | `(message)` | Server-side execution error |
| `status` | `(queueRemaining)` | Queue position update |
| `start` | `(promptId)` | Execution started |
| `cached` | `(nodeCount)` | Cached nodes reused |
| `executing` | `(nodeId)` | A node started (string ID) |
| `progress` | `(value, max, pct)` | Sampler progress (pct = 0–100) |
| `executed` | `(nodeId, images)` | A node finished; images is `[]` or array of `{filename, subfolder, type}` |
| `done` | `(promptId)` | All nodes finished |
| `preview` | `(blobUrl)` | Live preview image ready (revoke old URLs yourself or use `revokePreview()`) |

## Static Utilities

```js
ComfyUIClient.generateUUID()    // → "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
ComfyUIClient.fmtDuration(ms)   // → "45s" or "2m 15s"
ComfyUIClient.formatEventLog(event, ...args)  // → {msg, style} or null — for building log lines
```

## Typical Workflow

1. Create client, register callbacks, call `connect()`
2. Parse workflow JSON from user, inject prompt text into the target node
3. Call `submitPrompt(workflow)` — get back `{promptId}`
4. Listen for `progress`, `preview`, `executing` events
5. On `done`, call `fetchHistory(promptId)` then `collectOutputImages()` to get output file info
6. Use `getImageUrl()` to build `<img>` src URLs for display

## Notes

- ComfyUI must be run with `--preview` flag to send binary preview frames over WebSocket
- Binary frames are auto-detected: standard 4-byte BE header, or fallback 1-byte with magic-byte sniffing (JPEG: `FF D8 FF`, PNG: `89 50 4E 47`)
- The library manages preview blob URLs internally; call `revokePreview()` when you're done
- Workflow preparation (JSON parsing, prompt injection) is the caller's responsibility
