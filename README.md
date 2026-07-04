# RGB Mosaic Generator

A browser-based tool that transforms a source image into an RGB mosaic, rendering each source pixel as a set of red, green, and blue subpixel tiles.

Developed by **Stefan Rau** — HSG KreativKomplizen, Ulm University.

## Running Locally

Since the app uses ES modules, serve it via HTTP:

```bash
python3 -m http.server 8765
```

Then open [http://localhost:8765](http://localhost:8765) in your browser.

## Workflow

1. **Upload Tiles**: Provide source images for Red, Green, and Blue channels.
2. **Upload Source**: Choose a main image to transform.
3. **Preprocess**: Scales tile images and downsamples the source grid.
4. **Tune & Render**: Adjust pixel/tile size, color tints, and texture blending, then render and download the high-resolution PNG.

All processing runs entirely client-side.
