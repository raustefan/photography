const subtitles = {
    mosaic: 'pixel -> subpixel tile mapping (R | G | B)',
    sine: 'subtractive CMYK sine-wave ink paths',
};

export function wireNavigation() {
    const buttons = Array.from(document.querySelectorAll('.mode-btn'));
    const views = {
        mosaic: document.getElementById('view-mosaic'),
        sine: document.getElementById('view-sine'),
    };
    const subtitle = document.getElementById('site-subtitle');

    buttons.forEach((button) => {
        button.addEventListener('click', () => {
            const mode = button.dataset.mode;
            buttons.forEach((btn) => btn.classList.toggle('active', btn === button));
            Object.entries(views).forEach(([key, view]) => {
                view.classList.toggle('active', key === mode);
            });
            subtitle.textContent = subtitles[mode];
        });
    });
}
