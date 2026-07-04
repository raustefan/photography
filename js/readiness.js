import { state } from './state.js';
import { dom } from './dom.js';

export function markDirty() {
    state.dirty = true;
    updateReadiness();
}

export function updateReadiness() {
    const checks = [
        ['red', state.redImages.length > 0],
        ['green', state.greenImages.length > 0],
        ['blue', state.blueImages.length > 0],
        ['main', state.mainImage !== null],
    ];

    let allReady = true;
    checks.forEach(([key, ok]) => {
        document.getElementById(`sd-${key}`).className =
            'status-dot' + (ok ? ' ready' : '');
        document.getElementById(`ri-${key}`).className =
            'readiness-item' + (ok ? ' ok' : '');
        if (!ok) allReady = false;
    });

    dom.btnPreprocess.disabled = !allReady || state.preprocessing || state.rendering;

    const canRender = !state.dirty && state.cache !== null &&
        !state.rendering && !state.preprocessing;
    dom.btnGenerate.disabled = !canRender;

    dom.bannerDirty.classList.toggle('active', state.dirty && state.cache !== null);

    if (state.preprocessing) {
        dom.preprocessStatus.textContent = 'Preprocessing…';
        dom.preprocessStatus.classList.remove('ready');
    } else if (state.dirty) {
        dom.preprocessStatus.textContent = state.cache
            ? 'Stale — settings changed, re-preprocess needed.'
            : 'Not preprocessed yet.';
        dom.preprocessStatus.classList.remove('ready');
    } else if (state.cache) {
        dom.preprocessStatus.textContent =
            `Preprocessed: ${state.cache.cols}×${state.cache.rows} px grid, ` +
            `${state.cache.tileSize}px tiles.`;
        dom.preprocessStatus.classList.add('ready');
    }
}
