# Todo

## Completed

- [x] Add mock ComfyUI client for testing without a server
  - Detect `http://mock.test` as server URL and swap in `MockComfyUIClient`
  - Mock client emits same event sequence as real client: `start`, `cached`, `executing`, `progress`, `preview`, `executed`, `done`
  - Fix `fetchHistory()` to return unwrapped history shape (not keyed by promptId)
- [x] Progressive preview images with decreasing blur
  - Each step generates a fresh canvas with blur going from 40px to 0px linearly
  - Shapes (zigzag lines, circles, diamond) match final image positioning
- [x] Random color palette per generation
  - 5 hand-picked palettes: blue, green, red, orange/yellow, purple
  - Preview and final image share the same palette within a single generation
  - Palette is randomly selected on each `submitPrompt()` call
- [x] Tone down bright center glow on final image
  - Radial gradient now uses `mid` color for inner stops instead of `light`
  - Text is readable on all palettes including orange/yellow
