import { state } from './state.js';
import { dom } from './dom.js';
import { updateReadiness } from './readiness.js';

const BATCH = 500;

export async function runRender() {
    if (!state.cache || state.dirty || state.rendering) return;

    const { cachedR, cachedG, cachedB, imgData, cols, rows, tileSize, outW, outH } =
        state.cache;

    const boostR = +document.getElementById('boost-red').value / 100;
    const boostG = +document.getElementById('boost-green').value / 100;
    const boostB = +document.getElementById('boost-blue').value / 100;
    const blendPct = +document.getElementById('blend-texture').value / 100;

    state.rendering = true;
    state.stopRequested = false;
    updateReadiness();

    dom.outputCanvas.width = outW;
    dom.outputCanvas.height = outH;

    dom.outputPanel.style.display = 'flex';
    dom.outputPanel.style.flexDirection = 'column';
    dom.outputMeta.textContent =
        `${cols}×${rows} pixels → ${cols * 3}×${rows} tiles → ${outW}×${outH}px`;

    dom.outputWrapper.classList.remove('hidden');
    dom.btnDownload.classList.add('hidden');
    dom.renderOverlay.classList.add('active');

    dom.btnStop.classList.add('active');
    dom.progressWrap.style.display = 'block';
    dom.progressFill.style.width = '0%';
    dom.progressText.textContent = 'Rendering…';

    dom.outputPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    await new Promise((r) => setTimeout(r, 10));

    const outCtx = dom.outputCanvas.getContext('2d');
    const total = cols * rows;
    let done = 0;

    function randItem(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function drawTile(canvas, destX, destY, tintColor, tintAlpha) {
        outCtx.globalCompositeOperation = 'source-over';
        outCtx.globalAlpha = 1;
        outCtx.drawImage(canvas, destX, destY);
        if (tintAlpha > 0.005) {
            outCtx.globalAlpha = tintAlpha;
            outCtx.fillStyle = tintColor;
            outCtx.fillRect(destX, destY, tileSize, tileSize);
            outCtx.globalAlpha = 1;
        }
    }

    function processBatch() {
        if (state.stopRequested) {
            state.rendering = false;
            state.stopRequested = false;
            dom.btnStop.classList.remove('active');
            dom.progressWrap.style.display = 'none';
            dom.renderOverlay.classList.remove('active');
            dom.outputWrapper.classList.add('hidden');
            updateReadiness();
            return;
        }

        const end = Math.min(done + BATCH, total);
        while (done < end) {
            const px = done % cols;
            const py = Math.floor(done / cols);
            const i = (py * cols + px) * 4;
            const r = imgData[i], g = imgData[i + 1], b = imgData[i + 2];
            const baseX = px * 3 * tileSize;
            const baseY = py * tileSize;

            drawTile(randItem(cachedR), baseX, baseY, '#ff0000', Math.min(1, (r / 255) * boostR));
            drawTile(randItem(cachedG), baseX + tileSize, baseY, '#00ff00', Math.min(1, (g / 255) * boostG));
            drawTile(randItem(cachedB), baseX + tileSize * 2, baseY, '#0000ff', Math.min(1, (b / 255) * boostB));
            done++;
        }

        const pct = Math.round((done / total) * 100);
        dom.progressFill.style.width = pct + '%';
        dom.progressText.textContent = `${pct}% — ${done} / ${total} pixels`;

        if (done < total) {
            requestAnimationFrame(processBatch);
        } else {
            if (blendPct > 0) {
                outCtx.globalCompositeOperation = 'overlay';
                outCtx.globalAlpha = blendPct;
                outCtx.drawImage(state.mainImage, 0, 0, outW, outH);
                outCtx.globalAlpha = 1;
                outCtx.globalCompositeOperation = 'source-over';
            }
            dom.progressText.textContent = 'Done.';
            state.rendering = false;
            dom.btnStop.classList.remove('active');
            dom.renderOverlay.classList.remove('active');
            dom.btnDownload.classList.remove('hidden');
            updateReadiness();
        }
    }

    requestAnimationFrame(processBatch);
}

export function wireRender() {
    dom.btnGenerate.addEventListener('click', runRender);

    dom.btnStop.addEventListener('click', () => {
        if (state.rendering) {
            state.stopRequested = true;
        }
    });

    dom.btnDownload.addEventListener('click', () => {
        const a = document.createElement('a');
        a.download = 'rgb-mosaic.png';
        a.href = dom.outputCanvas.toDataURL('image/png');
        a.click();
    });
}
