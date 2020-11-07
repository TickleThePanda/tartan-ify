const circularTween = (function() {
  // degrees => radians
  var dtor = function(d) { return d * Math.PI / 180; };
  // radians => degrees
  var rtod = function(r) { return r * 180 / Math.PI; };

  return function(start, stop) {
    start = dtor(start);
    stop = dtor(stop);
    var delta = Math.atan2(Math.sin(stop - start), Math.cos(stop - start));
    return function tween(i) {
      return (rtod(start + delta * i) + 360) % 360;
    };
  };
})();

function linearTween(start, stop) {
  return function tween(i) { return (stop-start) * i + start; };
};

function hslToRgb(h, s, l){
  var r, g, b;

  if (s == 0){
    r = g = b = l; // achromatic
  }else{
    var hue2rgb = function hue2rgb(p, q, t){
        if(t < 0) t += 1;
        if(t > 1) t -= 1;
        if(t < 1/6) return p + (q - p) * 6 * t;
        if(t < 1/2) return q;
        if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    }

    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHsl(r, g, b) {
  r /= 255, g /= 255, b /= 255;

  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }

    h /= 6;
  }

  return [ h, s, l ];
}

function scale(data) {

    const max = data
          .filter(m => m !== -1)
          .reduce((a, b) => Math.max(a, b), Number.MIN_SAFE_INTEGER);

    const min = data
          .filter(m => m !== -1)
          .reduce((a, b) => Math.min(a, b), Number.MAX_SAFE_INTEGER);

    const range = max - min;

    return data
      .map(v => v === -1 ? -1 : (v - min) / range);

}

class MusicSimilarityRenderer {

  constructor(colors) {
    this.colorDiff = colors.diff;
    this.colorSimilar = colors.similar;
  }

  render(data) {

    if (data.length > 0) {

      const scaled = scale(data);

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

          let [r,g,b] = hslToRgb(
            hf(v),
            sf(v),
            lf(v)
          );

          if (i === j) {
            r = g = b = 255;
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
}

function colorTextToRgb(text) {
  const cleaned = text.trim().replace('#', '');

  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);

  return [r, g, b];
}

onmessage = function({
  data: {
    colors: {
      diff,
      similar
    },
    buffer
  }
}) {

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

  const data = new Float32Array(buffer);

  const renderer = new MusicSimilarityRenderer(colors);

  const render = renderer.render(data);

  const outBuffer = render.buffer;

  postMessage(outBuffer, [outBuffer]);


}
