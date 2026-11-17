import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { notificationDefinitions } from '../src/notifications.ts';

// Build-time subset of the upstream Elden Ring NOUN VERBED renderer and er:victory preset:
// https://github.com/Sibert-Aerts/sibert-aerts.github.io/tree/master/new-area/image-creator
const { min, max, floor } = Math;
const browserIs = { chrome: false };
const width = 1920;
const height = 1080;
const scriptDirectory = dirname(fileURLToPath(import.meta.url));

const victoryPreset = {
    position: { xOffset: 0, yOffset: 0, scale: 1 },
    font: {
        fontSize: 88,
        fontFamily: 'Agmena Pro',
        fontFamilyFallback: 'adobe-garamond-pro, Noto Serif JP, serif',
        vScale: 1,
        charSpacing: 0,
        fontWeight: 300,
        textColor: [220, 175, 45]
    },
    zoomBlur: {
        textOpacity: 1,
        blurTint: [255, 208, 66],
        blurSize: 1.11,
        blurOpacity: 0.18
    },
    shadow: {
        shadowSize: 0.7,
        shadowOpacity: 0.65,
        shadowOffset: -0.006,
        shadowSoftness: 1.05
    },
    gradient: {}
};

const failurePreset = {
    ...victoryPreset,
    font: {
        ...victoryPreset.font,
        textColor: [220, 45, 45]
    },
    zoomBlur: {
        ...victoryPreset.zoomBlur,
        blurTint: [255, 56, 56]
    }
};

function drawShadowBar(ctx, canvas, sliders, scale) {
    const { shadowSize, shadowOpacity, shadowOffset, shadowSoftness } = sliders.shadow;
    if (shadowSize <= 0) return;

    const shadowHeight = shadowSize * 0.25 * canvas.height * scale;
    const shadowCenter = shadowOffset * scale * canvas.height;
    const top = shadowCenter - shadowHeight / 2;
    const bottom = shadowCenter + shadowHeight / 2;
    const softnessLow = min(1, shadowSoftness);
    const softnessHigh = max(1, shadowSoftness) - 1;
    const gradient = ctx.createLinearGradient(0, top, 0, bottom);
    gradient.addColorStop(0, '#0000');
    gradient.addColorStop(0.25 * softnessLow, `rgba(0, 0, 0, ${shadowOpacity})`);
    gradient.addColorStop(1 - 0.25 * softnessLow, `rgba(0, 0, 0, ${shadowOpacity})`);
    gradient.addColorStop(1, '#0000');
    ctx.fillStyle = gradient;

    if (softnessHigh > 0) {
        ctx.filter = `blur(${floor(shadowHeight * softnessHigh / 4)}px)`;
    }
    ctx.fillRect(-shadowHeight / 2, top, canvas.width + shadowHeight, shadowHeight);
    ctx.filter = 'none';
}

function applyFontSliders(ctx, canvas, sliders, scale = 1) {
    const { fontSize, textColor, fontFamily, fontFamilyFallback, vScale, charSpacing, fontWeight } = sliders.font;
    let caption = sliders.caption;

    if (browserIs.chrome) {
        canvas.style.letterSpacing = `${floor(charSpacing * scale)}px`;
        ctx.translate(charSpacing * scale / 2, 0);
    } else if (charSpacing > 0) {
        const space = ' '.repeat(floor(charSpacing / 5));
        caption = caption.split('').join(space);
    }

    ctx.font = `${fontWeight} ${fontSize * scale}px ${fontFamily}, ${fontFamilyFallback}`;
    ctx.fillStyle = `rgb(${textColor.join()})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.scale(1, vScale);
    return [caption, vScale];
}

function drawMultilineText(ctx, text, { x = 0, y = 0, lineHeight = 0, align = 'center' } = {}) {
    const lines = text.split('\n');
    let y0 = y;
    if (align === 'center') y0 -= (lines.length - 1) / 2 * lineHeight;
    if (align === 'bottom') y0 -= (lines.length - 1) * lineHeight;
    for (let i = 0; i < lines.length; i += 1) {
        ctx.fillText(lines[i], x, y0 + lineHeight * i);
    }
}

function drawEldenNounVerbed(ctx, canvas, sliders) {
    const { xOffset, yOffset, scale: presetScale } = sliders.position;
    const { textOpacity, blurTint, blurSize, blurOpacity } = sliders.zoomBlur;
    const { textColor, fontSize } = sliders.font;
    const gradientKey = sliders.gradient?.gradient;
    const scale = canvas.height / 1080 * presetScale;
    const x = xOffset * canvas.width + canvas.width / 2;
    const y = yOffset * canvas.height + canvas.height / 2;

    ctx.translate(0, y);
    drawShadowBar(ctx, canvas, sliders, presetScale);
    ctx.translate(x, 0);

    const [caption, verticalScale] = applyFontSliders(ctx, canvas, sliders, scale);
    if (gradientKey) {
        throw new Error(`Unsupported upstream gradient preset: ${gradientKey}`);
    }
    ctx.fillStyle = `rgba(${textColor}, ${textOpacity})`;
    drawMultilineText(ctx, caption, { lineHeight: fontSize * scale });

    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowBlur = 1;
    const scaleX = blurSize;
    const scaleY = 1 + (blurSize - 1) / 2;
    ctx.scale(scaleX, scaleY);
    ctx.fillStyle = `rgba(${blurTint.join()}, ${blurOpacity})`;
    drawMultilineText(ctx, caption, { lineHeight: fontSize * scale });
}

const outputDirectory = resolve(scriptDirectory, '../dist/banners');
await mkdir(outputDirectory, { recursive: true });

for (const [action, definition] of Object.entries(notificationDefinitions)) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    const preset = definition.tone === 'failure' ? failurePreset : victoryPreset;
    drawEldenNounVerbed(context, canvas, {
        ...preset,
        caption: definition.title.toUpperCase()
    });
    await writeFile(resolve(outputDirectory, `${action}.png`), canvas.toBuffer('image/png'));
}

const iconSize = 512;
const iconCanvas = createCanvas(iconSize, iconSize);
const iconContext = iconCanvas.getContext('2d');
const brandingImage = await loadImage(resolve(scriptDirectory, '../public/assets/image.jpg'));
iconContext.drawImage(brandingImage, 0, 0, 300, 300, 0, 0, iconSize, iconSize);
iconContext.fillStyle = 'rgba(0, 0, 0, 0.18)';
iconContext.fillRect(0, 0, iconSize, iconSize);

const iconPreset = {
    ...victoryPreset,
    position: { ...victoryPreset.position, scale: 5.9 },
    font: { ...victoryPreset.font, fontWeight: 600 },
    shadow: { ...victoryPreset.shadow, shadowSize: 0 }
};
drawEldenNounVerbed(iconContext, iconCanvas, { ...iconPreset, caption: 'EH' });

const iconOutputDirectory = resolve(scriptDirectory, '../dist/assets');
await mkdir(iconOutputDirectory, { recursive: true });
for (const size of [16, 24, 32, 48, 128]) {
    const icon = createCanvas(size, size);
    icon.getContext('2d').drawImage(iconCanvas, 0, 0, size, size);
    await writeFile(resolve(iconOutputDirectory, `icon${size}.png`), icon.toBuffer('image/png'));
}
