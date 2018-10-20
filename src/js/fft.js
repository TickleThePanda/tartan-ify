importScripts('fft-library.js');

function getMergedChannels(buffers) {
  const channels = buffers.map(b => new Float32Array(b));
  const totalSamples = channels[0].length;

  const combined = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    let sum = 0;
    for (let iC = 0; iC < channels.length; iC++) {
      sum += channels[iC][i];
    }
    combined[i] = sum / channels.length;
  }
  
  return combined;
}

onmessage = function(message) {

  const buffers = message.data.buffers;

  const sampleRate = message.data.sampleRate;
  const interval = message.data.interval;
  const intervalRate = interval / 1000;

  const combined = getMergedChannels(buffers);
  const totalSamples = combined.length;
  
  let startSample = 0;

  const temp = new Float32Array(length / 2);
  const freqDatas = [];

  const samplesPerInterval = sampleRate * intervalRate;

  for (let intervalStart = 0;
            intervalStart + samplesPerInterval < totalSamples;
            intervalStart += samplesPerInterval) {

    let count = 0;

    const intervalEnd = intervalStart + samplesPerInterval;

    const freqData = new Float32Array(length / 2);

    for(let windowStart = intervalStart;
          windowStart + length < intervalEnd;
          windowStart += length) {

      const windowEnd = windowStart + length;

      const sliced = combined.slice(windowStart, windowEnd);

      calculateFrequencyData(sliced, temp);

      count++;

      for(let i = 0; i < length; i++) {
        freqData[i] += temp[i];
      }
    }

    for(let i = 0; i < length; i++) {
      freqData[i] /= count;
    }

    freqDatas.push(freqData);
  }

  const fftBuffers = freqDatas.map(fd => fd.buffer);

  postMessage(fftBuffers, fftBuffers);

}

