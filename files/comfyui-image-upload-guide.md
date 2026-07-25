# Uploading base64 images to local ComfyUI

Goal: take a base64 image already in memory in a Svelte/TS app, upload it to ComfyUI, get back a filename, and put that filename into `workflow.json` before submitting.

ComfyUI's `/prompt` endpoint never accepts image bytes or base64 directly. `LoadImage` nodes only accept a filename that already exists on disk in ComfyUI's `input/` folder. So the flow is always: upload first, then reference the returned name.

## Step 1: Convert base64 to a Blob

```typescript
function base64ToBlob(base64: string, mimeType: string): Blob {
  // Strip a data URL prefix if present, e.g. "data:image/png;base64,"
  const raw = base64.includes(",") ? base64.split(",")[1] : base64;

  const byteChars = atob(raw);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
```

## Step 2: Upload the image

Send it as `multipart/form-data` to `/upload/image`. Do not send JSON, do not send raw base64 in the body.

```typescript
async function uploadImage(
  base64: string,
  filename: string,
  mimeType: string = "image/png",
  serverUrl: string = "http://127.0.0.1:8188"
): Promise<string> {
  const blob = base64ToBlob(base64, mimeType);

  const formData = new FormData();
  formData.append("image", blob, filename);
  formData.append("type", "input");
  formData.append("overwrite", "true");

  const response = await fetch(`${serverUrl}/upload/image`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: HTTP ${response.status}`);
  }

  const result = await response.json();
  // ComfyUI returns { name, subfolder, type }
  return result.name;
}
```

Important: do not set a `Content-Type` header manually when sending `FormData`. The browser sets the correct multipart boundary automatically. Setting it yourself breaks the upload.

## Step 3: Put the returned name into workflow.json

Find the node in your workflow JSON with `class_type: "LoadImage"` and set its `inputs.image` field to the name returned in step 2.

```typescript
function setWorkflowImage(
  workflow: Record<string, any>,
  loadImageNodeId: string,
  uploadedName: string
): Record<string, any> {
  workflow[loadImageNodeId].inputs.image = uploadedName;
  return workflow;
}
```

`loadImageNodeId` is the key in the workflow JSON, e.g. `"10"`. Open your exported `workflow_api.json` and find the node with `class_type: "LoadImage"` to get its ID. This ID is fixed per workflow, hardcode it once you know it.

## Step 4: Submit the workflow

```typescript
async function submitWorkflow(
  workflow: Record<string, any>,
  serverUrl: string = "http://127.0.0.1:8188"
): Promise<string> {
  const response = await fetch(`${serverUrl}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: workflow,
      client_id: crypto.randomUUID(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Submit failed: HTTP ${response.status}`);
  }

  const result = await response.json();
  return result.prompt_id;
}
```

## Full example, tying it together

```typescript
async function runWorkflowWithImage(
  base64Image: string,
  workflowTemplate: Record<string, any>,
  loadImageNodeId: string
): Promise<string> {
  const uploadedName = await uploadImage(base64Image, "input.png", "image/png");

  const workflow = structuredClone(workflowTemplate);
  setWorkflowImage(workflow, loadImageNodeId, uploadedName);

  const promptId = await submitWorkflow(workflow);
  return promptId;
}
```

## Common mistakes to avoid

- Do not put base64 or a data URL directly into `inputs.image` on the LoadImage node. It only accepts a filename string.
- Do not manually set `Content-Type: multipart/form-data` on the upload request. Let `fetch` set it with the correct boundary.
- Do not skip stripping the `data:image/png;base64,` prefix if the base64 string came from a `<canvas>` or file input, it will corrupt the decoded bytes otherwise.
- Do not reuse the same filename across concurrent uploads if you need to keep them distinct. `overwrite: true` will replace an existing file of the same name.
- Do not forget `client_id` on submit if you plan to listen for progress over the WebSocket, ComfyUI uses it to route messages to the right connection.
