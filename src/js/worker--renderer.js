importScripts('lib--color.js');

const TOO_DIFFERENT = -3;
const TOO_SIMILAR = -2;
const EXCLUDED_SAME_INDEX = -1;
const EXCLUDED_NO_DIFF = 0;

const EXCLUDED = [TOO_DIFFERENT, TOO_SIMILAR, EXCLUDED_SAME_INDEX, EXCLUDED_NO_DIFF];

function skipExcluded(f) {
  return v => EXCLUDED.includes(v) ? v : f(v);
}
const filterExcluded = v => !EXCLUDED.includes(v);

const mapFuncs = {
  exponential: v => Math.pow(2, v),
  squared: v => v * v,
  linear: v => v,
  sqrt: v => Math.sqrt(v),
  log: v => Math.log(1 + v),
};

onmessage = function({
  data: {
    colors: {
      diff,
      similar
    },
    thresholds,
    scale,
    diffs
  }
}) {

  console.log(`worker--renderer - colors: ${diff} ${similar}, bufferLength: ${diffs.byteLength}, scale: ${scale}, thresholds: ${thresholds.min} ${thresholds.max}`);

  let colors = [];

  const colorDiffRgb = colorTextToRgb(diff);
  const colorSimilarRgb = colorTextToRgb(similar);

  colors.diff = rgbToHsl(
    colorDiffRgb[0],
    colorDiffRgb[1],
    colorDiffRgb[2]
  );
  colors.similar = rgbToHsl(
    colorSimilarRgb[0],
    colorSimilarRgb[1],
    colorSimilarRgb[2]
  );

  const data = new Float32Array(diffs);

  const renderer = new MusicSimilarityRenderer({
    colors, thresholds, mapper: mapFuncs[scale]
  });

  const render = renderer.render(data);

  console.log(`worker--renderer.js - renderSize: ${render.length}`);

  const outBuffer = render.buffer;

  postMessage(outBuffer, [outBuffer]);
}

class MusicSimilarityRenderer {

  constructor({colors: { diff, similar }, thresholds, mapper}) {
    this.colorDiff = diff;
    this.colorSimilar = similar;

    this.thresholds = thresholds;

    this.mapper = mapper;
  }

  render(data) {

    if (data.length > 0) {

      const scaled = this.scale(data);

      const hE = this.colorSimilar[0];
      const hS = this.colorDiff[0];
      const hf = circularTween(hE, hS);

      const sE = this.colorSimilar[1];
      const sS = this.colorDiff[1];
      const sf = linearTween(sE, sS);

      const lE = this.colorSimilar[2];
      const lS = this.colorDiff[2];
      const lf = linearTween(lE, lS);

      const width = Math.sqrt(scaled.length);

      const array = new Uint8ClampedArray(width * width * 4);

      for (let i = 0; i < width; i++) {
        for (let j = 0; j < width; j++) {

          const v = scaled[i * width + j];

          const pos = (i * width + j) * 4;

          let [r,g,b] = [0,0,0];

          if (v === EXCLUDED_SAME_INDEX || v === EXCLUDED_NO_DIFF || v === TOO_SIMILAR) {
            [r,g,b] = hslToRgb(
              hf(0),
              sf(0),
              lf(0)
            );
          } else if (v === TOO_DIFFERENT) {
            [r,g,b] = hslToRgb(
              hf(1),
              sf(1),
              lf(1)
            );
          } else {
            [r,g,b] = hslToRgb(
              hf(v),
              sf(v),
              lf(v)
            );
          }

          array[pos    ] = r;
          array[pos + 1] = g;
          array[pos + 2] = b;
          array[pos + 3] = 255;

        }
      }

      return array;
    }
  }


  scale(all) {

    const max = d => d.filter(filterExcluded)
      .reduce((a, b) => Math.max(a, b), Number.MIN_SAFE_INTEGER);
    const min = d => d.filter(filterExcluded)
      .reduce((a, b) => Math.min(a, b), Number.MAX_SAFE_INTEGER);

    const sorted = [...all].filter(filterExcluded).sort((a, b) => a - b);

    const tooSimilar = sorted[Math.floor(all.length * this.thresholds.min)];
    const tooDifferent = sorted[Math.ceil(all.length * this.thresholds.max)];

    const data = all
      .map(skipExcluded(v => v < tooSimilar ? TOO_SIMILAR : v))
      .map(skipExcluded(v => v > tooDifferent ? TOO_DIFFERENT : v));

    const scaledSimilarity = data
      .map(skipExcluded(v => this.mapper(v)));

    const maxScaled = max(scaledSimilarity);
    const minScaled = min(scaledSimilarity);

    const rangeScaled = maxScaled - minScaled;

    console.log(`scaled - minValue: ${minScaled}, maxValue: ${maxScaled}`)

    const norm = scaledSimilarity
      .map(skipExcluded(v => (v - minScaled) / rangeScaled)); // invert back to diff

    console.log(`normalised - minValue: ${min(norm)}, maxValue: ${max(norm)}`);

    return norm;
  }
}

function colorTextToRgb(text) {
  const cleaned = text.trim().replace('#', '');

  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);

  return [r, g, b];
}

