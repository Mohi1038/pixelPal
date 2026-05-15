# PixelPal

PixelPal is a Chrome extension concept turned into a working scaffold: a low-poly AI companion that lives on top of webpages, reads page context, reacts with an emotion state machine, and stores memory locally with hooks for a Kademlia-style distributed layer.

## What this build includes

- A Manifest V3 Chrome extension scaffold.
- A stylized in-page overlay with a game-like HUD.
- A Three.js low-poly companion rendered inside the page with a state-driven animation rig.
- Background messaging for page snapshots and user activity.
- Local memory storage and semantic similarity helpers.
- A command deck for configuring a remote OpenAI-compatible backend.
- Stubbed DHT modules so the architecture is real, but still browser-safe.

## Build

```bash
npm install
npm run build
```

Then load the `dist` folder as an unpacked extension in Chrome.

Use the popup to open the command deck and configure the remote LLM endpoint if you want PixelPal to call a real model instead of the local fallback.

## Architecture notes

- The overlay is intentionally bold and game-like: beveled panels, clipped geometry, glow layers, and a low-poly character built from primitives.
- The AI layer is offline-first right now. It uses deterministic generation so the extension works without a backend.
- The DHT layer is scaffolded, not networked yet. That keeps the browser version stable while leaving room for WebRTC or WebSocket transport later.
