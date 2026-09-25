# Wowbench

One-shot websites built by different models from an empty folder, each given the same prompt:

> Build the craziest website you can build. I want something that makes me go wow.

| Folder | Model | Effort | Harness | Time | Result |
| --- | --- | --- | --- | --- | --- |
| [`grok/`](grok/) | **Grok 4.6** | High | Grok Build | 33 minutes | APHELION |
| [`claude/`](claude/) | **Claude Opus 5.5** | High | Claude Code | 13 minutes | Event Horizon |
| [`space-bunny/`](space-bunny/) | **Space Bunny Free** | High | OpenCode | 2 minutes 28 seconds | VOID/03 |
| [`codex/`](codex/) | **GPT 6 Astra** | High | Codex | 15 minutes | OTHERWORLD |

## Grok: APHELION

Six raymarched worlds, a cinematic gate, and a small generative soundtrack. HTML, CSS, and WebGL2 shaders.

```bash
cd grok
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

Click **enter**. Scroll or use the arrow keys to travel. `?` shows the rest of the controls.

## Claude: Event Horizon

A real-time ray tracer that bends light around a black hole, with Doppler shifting, three black hole masses, and a fall past the horizon. A single HTML file with WebGL2.

```bash
cd claude
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

Drag to orbit. Scroll to change distance. `G` toggles gravity, `D` toggles Doppler, and `Space` falls in.

## Space Bunny Free: VOID/03

Four scroll-driven worlds in one procedural shader, with a nebula, an aurora, an impossible machine, and an event horizon. It also has pointer-reactive shockwaves, glitch type, and a generative ambient soundtrack. HTML, CSS, and WebGL2, with a 2D canvas fallback.

```bash
cd space-bunny
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

Click **Initiate Descent**. Scroll or press `Space` to travel. **Fracture the Sky** breaks the background, and the top-right button toggles sound.

## Codex: OTHERWORLD

An interactive cosmic observatory with three animated phenomena, a custom WebGL shader, immersive mode, field notes, and a locally synthesized soundtrack. HTML, CSS, and JavaScript with no runtime dependencies.

```bash
cd codex
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173). Choose a phenomenon with the tabs or arrow keys, drag to distort the view, and click **Enter the Void** for immersive mode.
