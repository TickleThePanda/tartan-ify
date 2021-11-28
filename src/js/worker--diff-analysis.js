onmessage = function({data: buffers}) {

  console.log(`worker--diff-analyis.js - nBuffers: ${buffers.length}, bufferLength: ${buffers[0].byteLength}`)

  const ffts = buffers.map(f => new Float32Array(f));

  const results = [];
  for (let i = 0; i < ffts.length; i++) {
    results[i] = [];
  }

  for (let i = 0; i < ffts.length; i++) {
    for (let j = i; j < ffts.length; j++) {
      let diff = 0;
      if (i === j) {
        diff = -1;
      } else {
        const left = ffts[i];
        const right = ffts[j];

        const leftSum = left
            .reduce((a, b) => a + b);

        const rightSum = right
            .reduce((a, b) => a + b);

        for (let k = 0; k < left.length; k++) {

          const leftNorm = leftSum === 0 ? 0 : left[k] / leftSum;
          const rightNorm = rightSum === 0 ? 0 : right[k] / rightSum;

          diff += Math.abs(leftNorm - rightNorm);
        }
      }

      const v = diff;

      results[j][i] = v;
      results[i][j] = v;
    }

  }

  const buffer = convertResultsToArray(results).buffer;

  postMessage(buffer);

}

function convertResultsToArray(results) {

  const arr = new SharedArrayBuffer(results.length * results.length * Float32Array.BYTES_PER_ELEMENT);

  const data = new Float32Array(arr);

  for (let i = 0; i < results.length; i++) {
    for (let j = 0; j < results.length; j++) {
      data[j * results.length + i] = results[i][j];
    }
  }

  return data;
}
