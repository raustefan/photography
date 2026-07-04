import { MAX_OUTPUT_RES } from './constants.js';
import { state } from './state.js';
import { dom } from './dom.js';
import { updateReadiness } from './readiness.js';

const YIELD_EVERY = 8;

function setPreprocessProgress(done, total, label) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    dom.preprocessProgressFill.style.width = pct + '%';
    dom.preprocessProgressText.textContent =
        `${pct}% — ${label} (${done} / ${total})`;
}

function preScaleOne(img, tileSize) {
    const c = document.createElement('canvas');
    c.width = tileSize;
    c.height = tileSize;
    c.getContext('2d').drawImage(img, 0, 0, tileSize, tileSize);
    return c;
}

function yieldToBrowser() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
}

async function scaleChannel(images, tileSize, label, doneRef, totalSteps) {
    const result = [];
    for (let i = 0; i < images.length; i++) {
        result.push(preScaleOne(images[i], tileSize));
        doneRef.value++;
        setPreprocessProgress(
            doneRef.value,
            totalSteps,
            `${label} tile ${i + 1} / ${images.length}`
        );
        if (i % YIELD_EVERY === YIELD_EVERY - 1) {
            await yieldToBrowser();
        }
    }
    return result;
}

export async function runPreprocess() {
    if (!state.mainImage || state.preprocessing || state.rendering) return;

    const pixelSize = +dom.pixelSizeEl.value;
    const tileSize = +dom.tileSizeEl.value;

    const srcW = state.mainImage.naturalWidth;
    const srcH = state.mainImage.naturalHeight;
    const cols = Math.max(1, Math.round(srcW / pixelSize));
    const rows = Math.max(1, Math.round((cols * 3 * srcH) / srcW));
    const outW = cols * 3 * tileSize;
    const outH = rows * tileSize;

    if (outW > MAX_OUTPUT_RES || outH > MAX_OUTPUT_RES) {
        alert(`Output size ${outW}×${outH}px exceeds max ${MAX_OUTPUT_RES}×${MAX_OUTPUT_RES}px.
Reduce pixel size or tile size.`);
        return;
    }

    const totalSteps =
        state.redImages.length +
        state.greenImages.length +
        state.blueImages.length +
        1;
    const doneRef = { value: 0 };

    state.preprocessing = true;
    dom.preprocessProgressWrap.style.display = 'block';
    dom.preprocessProgressFill.style.width = '0%';
    setPreprocessProgress(0, totalSteps, 'Starting…');
    updateReadiness();

    await yieldToBrowser();

    const cachedR = await scaleChannel(
        state.redImages, tileSize, 'Red', doneRef, totalSteps
    );
    const cachedG = await scaleChannel(
        state.greenImages, tileSize, 'Green', doneRef, totalSteps
    );
    const cachedB = await scaleChannel(
        state.blueImages, tileSize, 'Blue', doneRef, totalSteps
    );

    setPreprocessProgress(doneRef.value, totalSteps, 'Downsampling source…');
    await yieldToBrowser();

    const small = document.createElement('canvas');
    small.width = cols;
    small.height = rows;
    small.getContext('2d').drawImage(state.mainImage, 0, 0, cols, rows);
    const imgData = small
        .getContext('2d')
        .getImageData(0, 0, cols, rows).data;

    doneRef.value++;
    setPreprocessProgress(doneRef.value, totalSteps, 'Done');

    state.cache = {
        cachedR,
        cachedG,
        cachedB,
        imgData,
        cols,
        rows,
        tileSize,
        pixelSize,
        outW,
        outH,
    };
    state.dirty = false;
    state.preprocessing = false;

    dom.preprocessProgressWrap.style.display = 'none';
    updateReadiness();
}

export function wirePreprocess() {
    dom.btnPreprocess.addEventListener('click', runPreprocess);
}
