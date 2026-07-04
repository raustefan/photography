import { sineState } from './sine-state.js';
import { sineDom } from './sine-dom.js';
import { updateSinePreview, updateSineReadiness } from './sine-render.js';

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = URL.createObjectURL(file);
    });
}

async function loadMain(file) {
    const image = await loadImage(file);
    sineState.image = image;
    sineDom.dropInner.innerHTML = `<img class="thumb" src="${image.src}" alt="source" />`;
    updateSinePreview();
    updateSineReadiness();
}

function wireDropZone(zone, onFiles) {
    ['dragenter', 'dragover'].forEach((eventName) => {
        zone.addEventListener(eventName, (event) => {
            event.preventDefault();
            zone.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
        zone.addEventListener(eventName, (event) => {
            event.preventDefault();
            zone.classList.remove('drag-over');
        });
    });

    zone.addEventListener('drop', async (event) => {
        const files = Array.from(event.dataTransfer.files).filter((file) =>
            file.type.startsWith('image/')
        );
        if (files.length) await onFiles(files);
    });
}

export function wireSineImageUpload() {
    sineDom.inputMain.addEventListener('change', async (event) => {
        if (event.target.files[0]) await loadMain(event.target.files[0]);
    });

    wireDropZone(sineDom.drop, async (files) => {
        await loadMain(files[0]);
    });
}
