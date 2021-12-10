const chai = require("chai");
const chaiAlmost = require("chai-almost");
const { expect } = chai;

chai.use(chaiAlmost(0.01));

const {
  circularTween,
  linearTween,
  hslToRgb,
  rgbToHsl,
} = require("./lib--color.js");

const COLORS = [
  {
    rgb: [255, 255, 255],
    hsl: [0, 0, 1],
  },
  {
    rgb: [0, 0, 0],
    hsl: [0, 0, 0],
  },
  {
    rgb: [238, 186, 195],
    hsl: [0.97, 0.6, 0.83],
  },
  {
    rgb: [68, 68, 69],
    hsl: [0.67, 0.007, 0.27],
  },
];

describe("lib--color", function () {
  describe("#rgbToHsl()", function () {
    for (let {
      hsl: [h, s, l],
      rgb: [r, g, b],
    } of COLORS) {
      it(`should return hsl(${h}, ${s},${l}) when rgb(${r}, ${g}, ${b})`, function () {
        const actual = rgbToHsl(r, g, b);
        expect(actual).to.be.deep.almost.equal([h, s, l]);
      });
    }
  });
  describe("#hslToRgb()", function () {
    for (let {
      hsl: [h, s, l],
      rgb: [r, g, b],
    } of COLORS) {
      it(`should return rgb(${r}, ${g}, ${b}) when hsl(${(h * 360).toFixed(
        0
      )}, ${(s * 100).toFixed(0) + "%"}, ${
        (l * 100).toFixed(0) + "%"
      })`, function () {
        const actual = hslToRgb(h, s, l);
        expect(actual).to.be.deep.almost.equal([r, g, b]);
      });
    }
  });
});
