import { MAX_OUTPUT_RES } from './constants.js';
import { state } from './state.js';
import { dom } from './dom.js';
import { markDirty } from './readiness.js';

export function updateOutputPreview() {
    if (!state.mainImage) return;

    const pixelSize = +dom.pixelSizeEl.value;
    const tileSize = +dom.tileSizeEl.value;

    const srcW = state.mainImage.naturalWidth;
    const srcH = state.mainImage.naturalHeight;

    const cols = Math.max(1, Math.round(srcW / pixelSize));
    const rows = Math.max(1, Math.round((cols * 3 * srcH) / srcW));

    const outW = cols * 3 * tileSize;
    const outH = rows * tileSize;

    dom.infoPxEl.textContent = `${cols}×${rows} pixels`;
    dom.infoTileEl.textContent = `Output image: ${outW}×${outH}px`;

    if (outW > MAX_OUTPUT_RES || outH > MAX_OUTPUT_RES) {
        dom.infoTileEl.style.color = '#c0392b';
    } else {
        dom.infoTileEl.style.color = 'var(--muted)';
    }
}

export function updateSliderRanges() {
    if (!state.mainImage) {
        dom.pixelSizeEl.min = 4;
        dom.pixelSizeEl.max = 512;
        dom.tileSizeEl.min = 6;
        dom.tileSizeEl.max = 48;
        return;
    }

    const srcW = state.mainImage.naturalWidth;
    const srcH = state.mainImage.naturalHeight;
    const maxDim = Math.max(srcW, srcH);

    const minPixel = Math.max(4, Math.round(maxDim * 0.002));
    const maxPixel = Math.round(maxDim * 0.1);
    dom.pixelSizeEl.min = minPixel;
    dom.pixelSizeEl.max = maxPixel;
    dom.pixelSizeEl.step = Math.max(1, Math.round((maxPixel - minPixel) / 100));

    if (+dom.pixelSizeEl.value < minPixel || +dom.pixelSizeEl.value > maxPixel) {
        dom.pixelSizeEl.value = Math.round((minPixel + maxPixel) / 2);
    }

    const cols = Math.max(1, Math.round(srcW / +dom.pixelSizeEl.value));
    const maxTile = Math.floor(MAX_OUTPUT_RES / (cols * 3));
    dom.tileSizeEl.min = 6;
    dom.tileSizeEl.max = Math.min(100, Math.max(6, maxTile));
    dom.tileSizeEl.step = 1;

    if (+dom.tileSizeEl.value > dom.tileSizeEl.max) {
        dom.tileSizeEl.value = dom.tileSizeEl.max;
    }

    updateOutputPreview();
}

export function wirePreviewSliders() {
    dom.pixelSizeEl.addEventListener('input', () => {
        document.getElementById('v-pixel').textContent = dom.pixelSizeEl.value;
        updateOutputPreview();
        markDirty();
    });

    dom.tileSizeEl.addEventListener('input', () => {
        document.getElementById('v-tile').textContent = dom.tileSizeEl.value;
        updateOutputPreview();
        markDirty();
    });
}
