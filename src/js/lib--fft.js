/*
 * Free FFT and convolution (JavaScript)
 *
 * Copyright (c) 2017 Project Nayuki. (MIT License)
 * Modifications Copyrigth (c) 2019 Panda (Thomas) Attwood
 * https://www.nayuki.io/page/free-small-fft-in-multiple-languages
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 * - The above copyright notice and this permission notice shall be included in
 *   all copies or substantial portions of the Software.
 * - The Software is provided "as is", without warranty of any kind, express or
 *   implied, including but not limited to the warranties of merchantability,
 *   fitness for a particular purpose and noninfringement. In no event shall the
 *   authors or copyright holders be liable for any claim, damages or other
 *   liability, whether in an action of contract, tort or otherwise, arising from,
 *   out of or in connection with the Software or the use or other dealings in the
 *   Software.
 */

"use strict";

const length = 2048;
const levels = 11;

// Trigonometric tables
const cosTable = new Float32Array(length / 2);
const sinTable = new Float32Array(length / 2);
for (var i = 0; i < length / 2; i++) {
  cosTable[i] = Math.cos(2 * Math.PI * i / length);
  sinTable[i] = Math.sin(2 * Math.PI * i / length);
}

const bra = new Float32Array(2048);

const real = new Float32Array(2048);
const imag = new Float32Array(2048);

function calculateFrequencyData(input, freqs) {

  // Length variables
  if (input.length != 2048) {
    throw "Mismatched lengths";
  }

  // Bit-reversed addressing permutation
  for (let i = 0; i < length; i++) {
    const j = reverseBits(i, levels);
    if (j > i) {
      bra[i] = input[j];
      bra[j] = input[i];
    }
  }

  real.fill(0);
  real.set(bra);
  imag.fill(0);

  // Cooley-Tukey decimation-in-time radix-2 FFT
  for (let size = 2; size <= length; size *= 2) {
    const halfsize = size / 2;
    const tablestep = length / size;
    for (let i = 0; i < length; i += size) {
      for (let j = i, k = 0; j < i + halfsize; j++, k += tablestep) {
        const l = j + halfsize;
        const tpre =  real[l] * cosTable[k] + imag[l] * sinTable[k];
        const tpim = -real[l] * sinTable[k] + imag[l] * cosTable[k];
        real[l] = real[j] - tpre;
        imag[l] = imag[j] - tpim;
        real[j] += tpre;
        imag[j] += tpim;
      }
    }
  }

  for (let i = 0; i < length / 2; i++) {
    freqs[i] = Math.sqrt(Math.pow(real[i], 2) + Math.pow(imag[i], 2));
  }

  // Returns the integer whose value is the reverse of the lowest 'bits' bits of the integer 'x'.
  function reverseBits(x, bits) {
    let y = 0;
    for (let i = 0; i < bits; i++) {
      y = (y << 1) | (x & 1);
      x >>>= 1;
    }
    return y;
  }
}
