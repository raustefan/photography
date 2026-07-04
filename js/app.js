import { updateReadiness } from './readiness.js';
import { wirePreviewSliders } from './preview.js';
import { wireImageUploads } from './images.js';
import { wirePreprocess } from './preprocess.js';
import { wireRender } from './render.js';
import { wireNavigation } from './navigation.js';
import { wireSineImageUpload } from './sine-images.js';
import { wireSineRender } from './sine-render.js';

function wireTintSliders() {
    [
        ['blend-texture', 'v-blend'],
        ['boost-red', 'v-br'],
        ['boost-green', 'v-bg'],
        ['boost-blue', 'v-bb'],
    ].forEach(([id, valId]) => {
        const el = document.getElementById(id);
        const val = document.getElementById(valId);
        el.addEventListener('input', () => { val.textContent = el.value; });
    });
}

wireTintSliders();
wireNavigation();
wirePreviewSliders();
wireImageUploads();
wirePreprocess();
wireRender();
wireSineImageUpload();
wireSineRender();
updateReadiness();
