import { state } from './state.js';
import { dom } from './dom.js';
import { updateSliderRanges } from './preview.js';
import { markDirty, updateReadiness } from './readiness.js';

export function loadImageFiles(files) {
    return Promise.all(
        Array.from(files).map(
            (f) => new Promise((res, rej) => {
                const img = new Image();
                img.onload = () => res(img);
                img.onerror = rej;
                img.src = URL.createObjectURL(f);
            })
        )
    );
}

export async function loadMain(file) {
    const [img] = await loadImageFiles([file]);
    state.mainImage = img;
    dom.mainDropInner.innerHTML =
        `<img class="thumb" src="${img.src}" alt="source" />`;
    updateSliderRanges();
    markDirty();
    updateReadiness();
}

export function wireImageUploads() {
    [
        ['red', 'zone-r', 'loaded-r'],
        ['green', 'zone-g', 'loaded-g'],
        ['blue', 'zone-b', 'loaded-b'],
    ].forEach(([color, zoneId, loadedClass]) => {
        document.getElementById(`input-${color}`).addEventListener('change', async (e) => {
            const imgs = await loadImageFiles(e.target.files);
            state[`${color}Images`] = imgs;
            document.getElementById(`count-${color}`).textContent =
                `${imgs.length} image${imgs.length !== 1 ? 's' : ''} loaded`;
            document.getElementById(zoneId).classList.add('loaded', loadedClass);
            markDirty();
            updateReadiness();
        });
    });

    dom.inputMain.addEventListener('change', async (e) => {
        if (e.target.files[0]) await loadMain(e.target.files[0]);
    });
}
