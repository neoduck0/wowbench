# Wowbench

One-shot websites built by different models from an empty folder, each given the same prompt:

> Build the craziest website you can build. I want something that makes me go wow.

| Folder | Model | Effort | Harness | Time | Result |
| --- | --- | --- | --- | --- | --- |
| [`grok/`](grok/) | **Grok 4.6** | High | Grok Build | 33 minutes | APHELION |
| [`claude/`](claude/) | **Claude Opus 5.5** | High | Claude Code | 13 minutes | Event Horizon |

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
