/**
 * Charts drawn as inline SVG at build time.
 *
 * Inline, so the marks inherit the page's custom properties and follow the
 * light and dark themes without a second palette. Static, so nothing is fetched
 * at runtime and the figures survive with JavaScript switched off. Every chart
 * carries a table of the same numbers, so no value is reachable only by hover.
 *
 * Colours: #5f45b5 on the light surface and #8f74e8 on the dark one. Both were
 * checked against the lightness band, chroma floor and contrast ratio rather
 * than chosen by eye.
 */

import { esc } from './html.mjs';

/** Bars never fill their band. The leftover is deliberate air. */
const MAX_BAR = 24;

/**
 * A rounded-top column path, square where it meets the baseline.
 *
 * @param {number} x Left edge.
 * @param {number} y Top edge.
 * @param {number} w Width.
 * @param {number} h Height.
 * @param {number} r Corner radius.
 * @returns {string} An SVG path.
 */
function columnPath(x, y, w, h, r = 4) {
  const radius = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h}V${y + radius}a${radius},${radius} 0 0 1 ${radius},${-radius}`
    + `h${w - radius * 2}a${radius},${radius} 0 0 1 ${radius},${radius}V${y + h}Z`;
}

/** Round a maximum up to a clean axis top. */
function niceMax(value) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / (magnitude / 2)) * (magnitude / 2);
}

/**
 * A column chart over time.
 *
 * @param {object} options Chart options.
 * @param {{label: string|number, value: number, note?: string}[]} options.data Bars, in order.
 * @param {string} options.title    What is plotted.
 * @param {string} options.caption  A sentence under the chart.
 * @param {string} options.id       Unique id, for the accessible title.
 * @param {string} [options.unit]   Appended to the labelled value.
 * @returns {string}
 */
export function columnChart({ data, title, caption, id, unit = '' }) {
  const W = 640;
  const H = 200;
  const padLeft = 38;
  const padRight = 8;
  const padTop = 20;
  const padBottom = 26;

  const plotW = W - padLeft - padRight;
  const plotH = H - padTop - padBottom;
  const band = plotW / data.length;
  const barW = Math.min(MAX_BAR, band - 6);

  const top = niceMax(Math.max(...data.map((d) => d.value)));
  const y = (v) => padTop + plotH - (v / top) * plotH;

  // Three gridlines and no more: they carry the values not directly labelled.
  const ticks = [0, top / 2, top];
  const grid = ticks.map((t) => `
    <line x1="${padLeft}" y1="${y(t).toFixed(1)}" x2="${W - padRight}" y2="${y(t).toFixed(1)}"
      stroke="var(--line)" stroke-width="1" shape-rendering="crispEdges" />
    <text x="${padLeft - 7}" y="${(y(t) + 3.5).toFixed(1)}" text-anchor="end"
      font-size="10" fill="var(--ink-3)">${t.toLocaleString('fr-FR')}</text>`).join('');

  // Label the peak only. The axis and the table carry the rest.
  const peak = data.reduce((a, b) => (b.value > a.value ? b : a), data[0]);

  const bars = data.map((d, i) => {
    const x = padLeft + i * band + (band - barW) / 2;
    const h = Math.max(0, (d.value / top) * plotH);
    const isPeak = d === peak && d.value > 0;
    return `
    <g>
      <title>${esc(d.label)}: ${esc(d.value)}${unit ? ` ${esc(unit)}` : ''}${d.note ? `. ${esc(d.note)}` : ''}</title>
      <path d="${columnPath(x, y(d.value), barW, h)}"
        fill="var(--chart-mark)" opacity="${d.note ? 0.42 : 1}" />
      ${isPeak ? `<text x="${(x + barW / 2).toFixed(1)}" y="${(y(d.value) - 6).toFixed(1)}"
        text-anchor="middle" font-size="10" font-weight="600" fill="var(--ink-2)">${d.value}</text>` : ''}
      <text x="${(x + barW / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle"
        font-size="10" fill="var(--ink-3)">${esc(d.label)}</text>
    </g>`;
  }).join('');

  return figure({ id, title, caption, W, H, body: grid + bars, data, unit });
}

/**
 * A ranked horizontal bar chart.
 *
 * @param {object} options Chart options.
 * @param {{label: string, value: number}[]} options.data Bars, already sorted.
 * @param {string} options.title   What is plotted.
 * @param {string} options.caption A sentence under the chart.
 * @param {string} options.id      Unique id.
 * @param {string} [options.unit]  Appended to the labelled value.
 * @returns {string}
 */
export function barChart({ data, title, caption, id, unit = '' }) {
  const W = 640;
  const rowH = 26;
  const padLeft = 116;
  const padRight = 44;
  const padTop = 6;
  const H = padTop + data.length * rowH + 6;

  const plotW = W - padLeft - padRight;
  const top = niceMax(Math.max(...data.map((d) => d.value)));
  const barH = Math.min(MAX_BAR, rowH - 8);

  const bars = data.map((d, i) => {
    const yTop = padTop + i * rowH + (rowH - barH) / 2;
    const w = Math.max(1, (d.value / top) * plotW);
    const radius = Math.max(0, Math.min(4, w));
    // Rounded at the data end, square at the baseline.
    const path = `M${padLeft},${yTop}h${w - radius}a${radius},${radius} 0 0 1 ${radius},${radius}`
      + `v${barH - radius * 2}a${radius},${radius} 0 0 1 ${-radius},${radius}H${padLeft}Z`;
    return `
    <g>
      <title>${esc(d.label)}: ${esc(d.value)}${unit ? ` ${esc(unit)}` : ''}</title>
      <text x="${padLeft - 10}" y="${(yTop + barH / 2 + 3.5).toFixed(1)}" text-anchor="end"
        font-size="11" fill="var(--ink-2)">${esc(d.label)}</text>
      <path d="${path}" fill="var(--chart-mark)" />
      <text x="${(padLeft + w + 7).toFixed(1)}" y="${(yTop + barH / 2 + 3.5).toFixed(1)}"
        font-size="10" fill="var(--ink-3)">${d.value}</text>
    </g>`;
  }).join('');

  return figure({ id, title, caption, W, H, body: bars, data, unit });
}

/**
 * Wrap a chart with its heading, caption and table of the same numbers.
 *
 * @param {object} options Wrapper options.
 * @returns {string}
 */
function figure({ id, title, caption, W, H, body, data, unit }) {
  const rows = data.map((d) => `<tr><th scope="row">${esc(d.label)}</th><td>${esc(d.value)}</td></tr>`).join('');

  return `
<figure class="chart" role="group" aria-labelledby="${esc(id)}-t">
  <figcaption class="chart__head">
    <h3 class="chart__title" id="${esc(id)}-t">${esc(title)}</h3>
    ${caption ? `<p class="chart__note">${esc(caption)}</p>` : ''}
  </figcaption>
  <svg class="chart__svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${esc(id)}-t"
    preserveAspectRatio="xMidYMid meet">${body}
  </svg>
  <details class="chart__data">
    <summary>${esc(unit || 'Table')}</summary>
    <table class="chart__table"><tbody>${rows}</tbody></table>
  </details>
</figure>`.trim();
}
