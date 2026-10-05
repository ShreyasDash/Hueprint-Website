const drop = document.getElementById('drop'), fileInput = document.getElementById('file'),
    preview = document.getElementById('preview'), results = document.getElementById('results'),
    palette = document.getElementById('palette'), list = document.getElementById('list'),
    resultSub = document.getElementById('resultSub'), reset = document.getElementById('reset'),
    toast = document.getElementById('toast');
document.getElementById('browse').addEventListener('click', () => fileInput.click());
drop.addEventListener('click', e => {
    if (!drop.classList.contains('has-image')) fileInput.click()
});
fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) loadImage(fileInput.files[0])
});
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => {
    e.preventDefault();
    drop.classList.add('drag')
}));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => {
    e.preventDefault();
    drop.classList.remove('drag')
}));
drop.addEventListener('drop', e => {
    const f = e.dataTransfer.files[0];
    if (f) loadImage(f)
});
reset.addEventListener('click', clearImage);

function loadImage(file) {
    if (!file.type.startsWith('image/')) return showToast('Please choose an image file');
    if (file.size > 20 * 1024 * 1024) return showToast('That image is over 20 MB');
    const url = URL.createObjectURL(file);
    preview.onload = () => {
        drop.classList.add('has-image');
        analyze(preview);
        URL.revokeObjectURL(url)
    };
    preview.onerror = () => showToast('This image could not be opened');
    preview.src = url
}

function analyze(img) {
    const scale = Math.min(1, 320 / Math.max(img.naturalWidth, img.naturalHeight)),
        w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale)),
        canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    ctx.drawImage(img, 0, 0, w, h);
    const px = ctx.getImageData(0, 0, w, h).data, bins = new Map();
    for (let i = 0; i < px.length; i += 4) {
        const a = px[i + 3] / 255;
        if (a < .18) continue;
        const r = Math.round(px[i] * a + 255 * (1 - a)), g = Math.round(px[i + 1] * a + 255 * (1 - a)),
            b = Math.round(px[i + 2] * a + 255 * (1 - a));
        const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
        let x = bins.get(key);
        if (!x) bins.set(key, x = {n: 0, r: 0, g: 0, b: 0});
        x.n++;
        x.r += r;
        x.g += g;
        x.b += b
    }
    const top = [...bins.values()].sort((a, b) => b.n - a.n).slice(0, 10), total = top.reduce((s, x) => s + x.n, 0);
    const colors = top.map(x => ({
        hex: '#' + [x.r / x.n, x.g / x.n, x.b / x.n].map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase(),
        pct: x.n / total * 100
    }));
    render(colors, w, h)
}

function render(colors, w, h) {
    results.classList.add('ready');
    reset.classList.remove('hidden');
    resultSub.textContent = `${w} × ${h} px · sampled palette`;
    palette.innerHTML = '';
    list.innerHTML = '';
    colors.forEach(c => {
        const sw = document.createElement('div');
        sw.className = 'swatch';
        sw.style.background = c.hex;
        sw.title = `${c.hex} · click to copy`;
        sw.innerHTML = `<span class="tip">${c.hex}</span>`;
        sw.addEventListener('click', () => copy(c.hex));
        palette.append(sw);
        const row = document.createElement('div');
        row.className = 'color-row';
        row.innerHTML = `<span class="chip" style="background:${c.hex}"></span><span class="hex">${c.hex}</span><span class="bar-wrap"><span class="bar" style="display:block;width:${c.pct.toFixed(1)}%"></span></span><span class="pct">${c.pct.toFixed(1)}%</span>`;
        row.title = 'Click to copy color';
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => copy(c.hex));
        list.append(row)
    })
}

function clearImage() {
    preview.removeAttribute('src');
    drop.classList.remove('has-image');
    fileInput.value = '';
    results.classList.remove('ready');
    reset.classList.add('hidden');
    resultSub.textContent = 'Your top 10 colors will appear here';
    palette.innerHTML = '';
    list.innerHTML = ''
}

async function copy(hex) {
    try {
        await navigator.clipboard.writeText(hex);
        showToast(`${hex} copied`)
    } catch {
        showToast(hex)
    }
}

function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1700)
}
