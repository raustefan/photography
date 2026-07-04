# RGB Mosaic Generator

A browser-based tool that turns a source image into an RGB mosaic. Each logical pixel of the source is rendered as three side-by-side tiles — red, green, and blue — tinted according to that pixel’s color channel values.

Developed by **Stefan Rau** — HSG KreativKomplizen, Ulm University.

## How it works

1. The source image is downsampled to a grid of *macro pixels* (controlled by **pixel size**).
2. For each grid cell, three random tiles are picked from the red, green, and blue image sets.
3. Each tile is drawn at **tile size** and overlaid with a color tint proportional to that cell’s R, G, or B value.
4. An optional **texture blend** pass overlays the original source for extra detail.

Conceptually: one source pixel → `R | G | B` subpixel tiles.

```
Source pixel (r, g, b)
        ↓
┌───────┬───────┬───────┐
│ red   │ green │ blue  │   ← random tile from each set, tinted by channel
│ tile  │ tile  │ tile  │
└───────┴───────┴───────┘
```

## Getting started

The app uses ES modules, so it must be served over HTTP — opening `index.html` directly from the filesystem will not work.

```bash
cd photography
python3 -m http.server 8765
```

Then open [http://localhost:8765](http://localhost:8765) in a browser.

No build step or dependencies required.

## Usage

### 1. Upload tile sets

Provide one or more images for each channel:

- **RED tiles** — drawn in the left subpixel slot
- **GREEN tiles** — middle slot
- **BLUE tiles** — right slot

Multiple images per channel add variety; a random tile is chosen per grid cell on each render.

### 2. Upload a source image

Drop or browse for the main image to convert into a mosaic.

### 3. Adjust settings

| Setting | Effect |
|---------|--------|
| **Pixel size** | How large each macro pixel is in source-image terms. Smaller = more detail, larger output grid. |
| **Tile size** | Pixel size of each individual tile in the output. |
| **Texture blend** | Overlays the source image on top (0–100%). Does not require re-preprocessing. |
| **Red / Green / Blue tint** | Boosts how strongly each channel tints its tiles (0–100%). Does not require re-preprocessing. |

Slider ranges adapt automatically once a source image is loaded. Output dimensions are shown in the settings panel. Maximum output size is 16 000 × 16 000 px.

### 4. Preprocess → Render

The workflow is split into two steps for performance:

**① Preprocess Tiles** — scales all tile images and downsamples the source into a pixel grid. Shows a progress bar. Required before the first render, and again after any structural change (see below).

**② Render Mosaic** — draws the mosaic using the cached data. Fast enough to re-run while tweaking tint and blend sliders.

Download the result as PNG when rendering completes.

## Cache & re-preprocessing

Some settings invalidate the preprocess cache and disable **Render** until you preprocess again:

- Tile image uploads (any channel)
- Source image change
- Pixel size change
- Tile size change

These do **not** invalidate the cache:

- Texture blend
- Red / Green / Blue tint sliders

Changing **pixel size** requires re-downsampling the source (different grid size and colors). Changing **tile size** requires re-scaling tile images. The app currently reruns both steps together; only the relevant part strictly needs to run, but the combined preprocess keeps the implementation simple.

## Project structure

```
photography/
├── index.html          # App markup
├── css/
│   └── styles.css      # Layout and UI styles
└── js/
    ├── app.js          # Entry point — wires up all modules
    ├── constants.js    # Shared constants (max output resolution)
    ├── state.js        # Shared application state
    ├── dom.js          # DOM element references
    ├── preview.js      # Output size preview & slider ranges
    ├── readiness.js    # Dirty tracking & button enable/disable logic
    ├── images.js       # File loading & upload handlers
    ├── preprocess.js   # Tile scaling + source downsampling
    └── render.js       # Mosaic drawing, stop, and download
```

## Browser support

Requires a modern browser with Canvas 2D and ES module support (recent Chrome, Firefox, Safari, Edge).

All processing happens locally in the browser — nothing is uploaded to a server.
