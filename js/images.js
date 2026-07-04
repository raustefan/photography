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

export function wireImageUploads() {
    [
        ['red', 'zone-r', 'loaded-r'],
        ['green', 'zone-g', 'loaded-g'],
        ['blue', 'zone-b', 'loaded-b'],
    ].forEach(([color, zoneId, loadedClass]) => {
        const zone = document.getElementById(zoneId);
        const input = document.getElementById(`input-${color}`);
        const handleFiles = async (files) => {
            const imgs = await loadImageFiles(files);
            state[`${color}Images`] = imgs;
            document.getElementById(`count-${color}`).textContent =
                `${imgs.length} image${imgs.length !== 1 ? 's' : ''} loaded`;
            zone.classList.add('loaded', loadedClass);
            markDirty();
            updateReadiness();
        };

        input.addEventListener('change', async (e) => {
            if (e.target.files.length) await handleFiles(e.target.files);
        });
        wireDropZone(zone, handleFiles);
    });

    dom.inputMain.addEventListener('change', async (e) => {
        if (e.target.files[0]) await loadMain(e.target.files[0]);
    });

    wireDropZone(document.getElementById('main-drop'), async (files) => {
        await loadMain(files[0]);
    });
}
