# LOGO Video Text Spotting: web frontend

A React frontend for the [Video-Text-Spotting](../Video-Text-Spotting) backend. Upload a video, run the
pipeline (detect, recognize, fuse, track, vote, render) as a background job and explore the result.

- **New analysis**: upload a clip (with a local preview) and start the analysis. The backend always runs its
  trained `configs/FINAL.yaml` (YOLO11s-OBB → ABINet LSC → soft fusion → VPMM + LST-Matcher → voting). If any
  trained file is missing, the page lists the exact paths and **Start analysis** stays disabled. The API also
  refuses the job (HTTP 503).
- **Job view**: shows live progress per stage with timings, and the pipeline log.
  - An **interactive overlay** draws the track boxes on the source video in the browser. Hover a track to
    highlight it, or click it to jump to it.
  - Also shows the rendered output, a track timeline and a sortable, filterable tracks table.
  - The rendered video and the tracks JSON can be downloaded.
- **Jobs**: history of every job on the API server.

## Required files

The backend checks these paths (relative to `Video-Text-Spotting/`, independent of the working directory)
and reports each one in `GET /api/health` under `model`:

| Component | Path |
| --- | --- |
| Detector (YOLO11s-OBB) | `runs/det_yolo11s_obb_text/train/weights/best.pt` |
| ABINet source | `third_party/ABINet/` (clone of FangShancheng/ABINet) |
| LSC (ABINet, fine-tuned) | `runs/E3-lsc/checkpoints/best.pth` (or `runs/A-all_yolo/checkpoints/best.pth`) |
| Tracker (VPMM + LST-Matcher) | `runs/E5-lst/checkpoints/best.pth` |
| LST-Matcher source | `third_party/GoMatching/` (clone of Hxyz-123/GoMatching) |

`runs/` and `third_party/` are in the backend's `.gitignore`, so none of these are committed. The checkpoints
are tracked with Git LFS in the original project repository. If a clone has only pointer files, run
`git lfs fetch origin --include="runs/E3-lsc/checkpoints/best.pth"` (and likewise for the tracker) and copy the
objects from `.git/lfs/objects` to the paths above, or run `git lfs pull`.

Every finished job is saved under `Video-Text-Spotting/runs/api/jobs/<job-id>/`: the uploaded video,
`output.mp4`, the browser-playable `output_web.mp4` and `source_web.mp4`, `result.json` and `log.txt`.

## Results and limits

- Steady video with clear text reads well (a laptop clip gave "dell", "gaming", "graphics", "geforce", "intel").
- Motion blur is the main failure: a fast pan over small text gives different misreads per frame, and the
  track vote cannot recover the word. Record steadily and pause on text.
- Typical speed on an NVIDIA MX350 (2 GB) is 2–11 frames per second, so a 10 s clip takes about a minute.
- Offline tests of blur-aware re-voting (sharpness weighting, sharpest-frame-only, clustering similar reads)
  did not beat the pipeline's own C3 voting, so it is unchanged.

Stack: Vite, React 18, TypeScript, Tailwind CSS 3, React Router, lucide-react.

## Running

### 1. Backend API (in `Video-Text-Spotting`)

```powershell
uv venv --python 3.11 .venv            # torch 2.1.2 needs Python 3.11
.venv\Scripts\Activate.ps1
uv pip install torch==2.1.2 torchvision==0.16.2 --index-url https://download.pytorch.org/whl/cu121
uv pip install -r requirements.txt -r requirements-api.txt
uv pip install -e ".[dev]"
python scripts/serve_api.py            # http://127.0.0.1:8000, serves configs/FINAL.yaml
```

Use `--config <name>` (or `$LOGO_CONFIG`) to serve another config from `configs/`. A job is refused (HTTP 503)
while any required file above is missing.

`requirements-api.txt` includes an ffmpeg binary (`imageio-ffmpeg`). The API uses it to save browser-playable
H.264 copies of the uploaded and rendered videos, keeping the source audio as AAC.

### 2. Frontend

```powershell
npm install
npm run dev                            # http://localhost:5173
```

The dev server proxies `/api` to `http://127.0.0.1:8000`. To change that, set `API_PROXY_TARGET` in `.env`
(see `.env.example`). For a static build served from another origin, set `VITE_API_BASE` before running
`npm run build`. Then pass that origin to the API with `--origin`.

## Layout

```
src/
  lib/api.ts          typed API client (fetch + XHR upload with progress)
  lib/hooks.ts        useAsync (load + poll), useNow
  lib/health.tsx      API health context, polled every 15 s
  lib/format.ts       formatting, track colours (same hues as the rendered video)
  components/         UI primitives, layout, video viewer + overlay, timeline, tables
  pages/              NewAnalysis, Jobs, JobDetail, NotFound
```
