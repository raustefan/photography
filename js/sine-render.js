import { sineState } from './sine-state.js';
import { sineDom } from './sine-dom.js';

const MAX_RENDER_WIDTH = 24000;
const MAX_RENDER_HEIGHT = 36000;
const CHANNELS = ['C', 'M', 'Y', 'K'];
const PHASE_OFFSETS = { C: 0, M: Math.PI / 2, Y: Math.PI, K: 3 * Math.PI / 2 };

function value(id) {
    return +document.getElementById(id).value;
}

function setText(id, text) {
    document.getElementById(id).textContent = text;
}

function yieldToBrowser() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
}

function updateProgress(done, total, label) {
    const pct = Math.max(0, Math.min(100, Math.round((done / total) * 100)));
    sineDom.progressFill.style.width = pct + '%';
    sineDom.progressText.textContent = `${pct}% - ${label}`;
}

function getSettings() {
    const kLineWidth = value('sine-k-width');
    const cmyLineWidth = value('sine-cmy-width') || kLineWidth * 3;
    return {
        binSize: value('sine-bin-size'),
        amplitude: value('sine-amp'),
        pxPerCell: value('sine-px-per-cell'),
        samplesPerCell: value('sine-samples') || null,
        cmyLineWidth,
        kLineWidth,
        supersample: value('sine-supersample'),
        cyclesPerCell: value('sine-freq'),
    };
}

function drawImageData(image, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height).data;
}

function binPixels(sourceData, sourceW, sourceH, binSize) {
    const gridW = Math.max(1, Math.floor(sourceW / binSize));
    const gridH = Math.max(1, Math.floor(sourceH / binSize));
    const out = new Float64Array(gridW * gridH * 3);

    for (let row = 0; row < gridH; row++) {
        for (let col = 0; col < gridW; col++) {
            let r = 0;
            let g = 0;
            let b = 0;
            for (let y = 0; y < binSize; y++) {
                for (let x = 0; x < binSize; x++) {
                    const idx = ((row * binSize + y) * sourceW + col * binSize + x) * 4;
                    r += sourceData[idx];
                    g += sourceData[idx + 1];
                    b += sourceData[idx + 2];
                }
            }
            const dest = (row * gridW + col) * 3;
            const count = binSize * binSize;
            out[dest] = r / count;
            out[dest + 1] = g / count;
            out[dest + 2] = b / count;
        }
    }

    return { data: out, width: gridW, height: gridH };
}

function rgbToCmyk(rgbData, cells) {
    const cmyk = new Float64Array(cells * 4);
    for (let i = 0; i < cells; i++) {
        const r = rgbData[i * 3] / 255;
        const g = rgbData[i * 3 + 1] / 255;
        const b = rgbData[i * 3 + 2] / 255;
        const k = 1 - Math.max(r, g, b);
        const denom = k >= 1 ? 1 : 1 - k;
        cmyk[i * 4] = k >= 1 ? 0 : Math.min(1, Math.max(0, (1 - r - k) / denom));
        cmyk[i * 4 + 1] = k >= 1 ? 0 : Math.min(1, Math.max(0, (1 - g - k) / denom));
        cmyk[i * 4 + 2] = k >= 1 ? 0 : Math.min(1, Math.max(0, (1 - b - k) / denom));
        cmyk[i * 4 + 3] = Math.min(1, Math.max(0, k));
    }
    return cmyk;
}

function serpentineCoords(h, w) {
    const coords = [];
    for (let row = 0; row < h; row++) {
        if (row % 2 === 0) {
            for (let col = 0; col < w; col++) coords.push([row, col]);
        } else {
            for (let col = w - 1; col >= 0; col--) coords.push([row, col]);
        }
    }
    return coords;
}

function adaptiveSamples(cyclesPerCell, pxPerCell) {
    const effectiveWavelength = 1 / cyclesPerCell;
    return Math.ceil(Math.max(24 / effectiveWavelength, pxPerCell / 2, 8));
}

function getAdaptiveBinRange(image) {
    const maxDim = Math.max(image.naturalWidth, image.naturalHeight);
    const min = Math.max(4, Math.round(maxDim / 150));
    const max = Math.max(min + 1, Math.round(maxDim / 25));
    return { min, max };
}

function clampBinSize(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function buildWavePoints(cmyk, gridW, gridH, settings, renderPxPerCell, samplesPerCell, phaseOffset, channelIndex) {
    const lines = [];
    const freq = settings.cyclesPerCell;
    const totalAmplitude = settings.amplitude;
    const edgeTaperWidth = 0.08; // Taper the amplitude over the first and last 8% of each line to soften edges

    for (let row = 0; row < gridH; row++) {
        const linePoints = [];
        for (let col = 0; col < gridW; col++) {
            const currentIdx = (row * gridW + col) * 4 + channelIndex;
            const nextIdx = (row * gridW + Math.min(col + 1, gridW - 1)) * 4 + channelIndex;
            const current = cmyk[currentIdx];
            const next = cmyk[nextIdx];

            for (let s = 0; s < samplesPerCell; s++) {
                const frac = s / samplesPerCell;
                const phase = 2 * Math.PI * freq * (col + frac) + phaseOffset;
                const intensity = current * (1 - frac) + next * frac;
                
                // Calculate taper factor to soften edges
                const xProgress = (col + frac) / gridW;
                let taper = 1.0;
                if (xProgress < edgeTaperWidth) {
                    taper = Math.sin((xProgress / edgeTaperWidth) * Math.PI / 2);
                } else if (xProgress > 1.0 - edgeTaperWidth) {
                    taper = Math.sin(((1.0 - xProgress) / edgeTaperWidth) * Math.PI / 2);
                }

                const offset = Math.sin(phase) * intensity * totalAmplitude * (renderPxPerCell / 2) * taper;
                const x = (col + frac) * renderPxPerCell;
                const y = (row + 0.5) * renderPxPerCell + offset;
                linePoints.push([x, y]);
            }
        }
        lines.push(linePoints);
    }

    return lines;
}

function renderInkLayer(lines, width, height, lineWidth) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    lines.forEach(linePoints => {
        linePoints.forEach(([x, y], index) => {
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
    });
    ctx.stroke();
    return ctx.getImageData(0, 0, width, height).data;
}

function compositeLayers(layers, width, height) {
    const imageData = new ImageData(width, height);
    const out = imageData.data;
    for (let i = 0; i < width * height; i++) {
        const c = layers.C ? layers.C[i * 4] / 255 : 0;
        const m = layers.M ? layers.M[i * 4] / 255 : 0;
        const y = layers.Y ? layers.Y[i * 4] / 255 : 0;
        const k = layers.K ? layers.K[i * 4] / 255 : 0;
        out[i * 4] = Math.round(255 * (1 - c) * (1 - k));
        out[i * 4 + 1] = Math.round(255 * (1 - m) * (1 - k));
        out[i * 4 + 2] = Math.round(255 * (1 - y) * (1 - k));
        out[i * 4 + 3] = 255;
    }
    return imageData;
}

function resizeToOutput(sourceCanvas, width, height) {
    const canvas = sineDom.outputCanvas;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(sourceCanvas, 0, 0, width, height);
}

export function updateSineReadiness() {
    const ready = Boolean(sineState.image);
    sineDom.statusDot.className = 'status-dot' + (ready ? ' ready' : '');
    sineDom.readinessItem.className = 'readiness-item' + (ready ? ' ok' : '');
    sineDom.btnGenerate.disabled = !ready || sineState.rendering;
}

export function updateSinePreview() {
    const image = sineState.image;
    const settings = getSettings();
    setText('sine-v-bin', settings.binSize);
    setText('sine-v-px', settings.pxPerCell);
    setText('sine-v-super', settings.supersample);
    setText('sine-v-amp', settings.amplitude.toFixed(2));
    setText('sine-v-freq', settings.cyclesPerCell.toFixed(1));
    setText('sine-v-samples', settings.samplesPerCell ?? 'auto');
    setText('sine-v-cmy', value('sine-cmy-width') || 'auto');
    setText('sine-v-k', settings.kLineWidth);

    if (!image) return;

    const binRange = getAdaptiveBinRange(image);
    const binInput = document.getElementById('sine-bin-size');
    binInput.min = String(binRange.min);
    binInput.max = String(binRange.max);
    const clampedBin = clampBinSize(settings.binSize, binRange.min, binRange.max);
    if (clampedBin !== settings.binSize) {
        binInput.value = String(clampedBin);
        setText('sine-v-bin', clampedBin);
    }

    const gridW = Math.max(1, Math.floor(image.naturalWidth / clampedBin));
    const gridH = Math.max(1, Math.floor(image.naturalHeight / clampedBin));
    const outW = gridW * settings.pxPerCell;
    const outH = gridH * settings.pxPerCell;
    const renderW = outW * settings.supersample;
    const renderH = outH * settings.supersample;
    sineDom.gridInfo.textContent = `${gridW}x${gridH} cells`;
    sineDom.outputInfo.textContent = `Output image: ${outW}x${outH}px`;
    sineDom.outputInfo.style.color =
        renderW > MAX_RENDER_WIDTH || renderH > MAX_RENDER_HEIGHT ? '#c0392b' : 'var(--muted)';
}

export async function runSineRender() {
    if (!sineState.image || sineState.rendering) return;

    const settings = getSettings();
    const sourceW = sineState.image.naturalWidth;
    const sourceH = sineState.image.naturalHeight;
    const binRange = getAdaptiveBinRange(sineState.image);
    settings.binSize = clampBinSize(settings.binSize, binRange.min, binRange.max);
    const gridW = Math.max(1, Math.floor(sourceW / settings.binSize));
    const gridH = Math.max(1, Math.floor(sourceH / settings.binSize));
    const renderPxPerCell = settings.pxPerCell * settings.supersample;
    const canvasW = gridW * renderPxPerCell;
    const canvasH = gridH * renderPxPerCell;

    if (canvasW > MAX_RENDER_WIDTH || canvasH > MAX_RENDER_HEIGHT) {
        alert(`Render size ${canvasW}x${canvasH}px is too large. Reduce px per cell, supersample, or increase bin size.`);
        return;
    }

    sineState.rendering = true;
    sineState.stopRequested = false;
    updateSineReadiness();

    sineDom.outputPanel.style.display = 'flex';
    sineDom.outputPanel.style.flexDirection = 'column';
    sineDom.outputWrapper.classList.remove('hidden');
    sineDom.btnDownload.classList.add('hidden');
    sineDom.renderOverlay.classList.add('active');
    sineDom.btnStop.classList.add('active');
    sineDom.progressWrap.style.display = 'block';
    sineDom.outputMeta.textContent =
        `${gridW}x${gridH} cells -> ${gridW * settings.pxPerCell}x${gridH * settings.pxPerCell}px`;
    updateProgress(0, 8, 'Starting');
    sineDom.outputPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    await yieldToBrowser();

    const sourceData = drawImageData(sineState.image, sourceW, sourceH);
    updateProgress(1, 8, 'Binning pixels');
    await yieldToBrowser();
    if (sineState.stopRequested) return finishStopped();

    const binned = binPixels(sourceData, sourceW, sourceH, settings.binSize);
    const cmyk = rgbToCmyk(binned.data, gridW * gridH);
    const samples = settings.samplesPerCell ||
        adaptiveSamples(settings.cyclesPerCell, renderPxPerCell);
    const layers = {};

    for (let channelIndex = 0; channelIndex < CHANNELS.length; channelIndex++) {
        if (sineState.stopRequested) return finishStopped();
        const name = CHANNELS[channelIndex];
        const points = buildWavePoints(
            cmyk,
            gridW,
            gridH,
            settings,
            renderPxPerCell,
            samples,
            PHASE_OFFSETS[name],
            channelIndex
        );
        const lineWidth = (name === 'K' ? settings.kLineWidth : settings.cmyLineWidth) *
            settings.supersample;
        layers[name] = renderInkLayer(points, canvasW, canvasH, lineWidth);

        // Progressively overlay the rendered layer on top of the output canvas
        const partialResult = compositeLayers(layers, canvasW, canvasH);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasW;
        tempCanvas.height = canvasH;
        tempCanvas.getContext('2d').putImageData(partialResult, 0, 0);
        resizeToOutput(tempCanvas, gridW * settings.pxPerCell, gridH * settings.pxPerCell);

        updateProgress(channelIndex + 2, 8, `Rendered ${name} ink`);
        await yieldToBrowser();
    }

    if (sineState.stopRequested) return finishStopped();
    const result = compositeLayers(layers, canvasW, canvasH);
    const renderCanvas = document.createElement('canvas');
    renderCanvas.width = canvasW;
    renderCanvas.height = canvasH;
    renderCanvas.getContext('2d').putImageData(result, 0, 0);
    updateProgress(7, 8, 'Compositing ink');
    await yieldToBrowser();

    resizeToOutput(renderCanvas, gridW * settings.pxPerCell, gridH * settings.pxPerCell);
    updateProgress(8, 8, 'Done');
    sineState.rendering = false;
    sineDom.btnStop.classList.remove('active');
    sineDom.renderOverlay.classList.remove('active');
    sineDom.btnDownload.classList.remove('hidden');
    updateSineReadiness();
}

function finishStopped() {
    sineState.rendering = false;
    sineState.stopRequested = false;
    sineDom.btnStop.classList.remove('active');
    sineDom.renderOverlay.classList.remove('active');
    sineDom.progressWrap.style.display = 'none';
    sineDom.outputWrapper.classList.add('hidden');
    updateSineReadiness();
}

export function wireSineRender() {
    document.querySelectorAll('#view-sine input[type="range"]').forEach((input) => {
        input.addEventListener('input', updateSinePreview);
    });

    sineDom.btnGenerate.addEventListener('click', runSineRender);
    sineDom.btnStop.addEventListener('click', () => {
        if (sineState.rendering) sineState.stopRequested = true;
    });
    sineDom.btnDownload.addEventListener('click', () => {
        const a = document.createElement('a');
        a.download = 'cmyk-sine-wave.png';
        a.href = sineDom.outputCanvas.toDataURL('image/png');
        a.click();
    });

    updateSinePreview();
    updateSineReadiness();
}
