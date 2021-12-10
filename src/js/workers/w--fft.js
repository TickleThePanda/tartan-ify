importScripts("lib--fft.js");
importScripts("lib--worker-status.js");

onmessage = function ({ data: { pcm, sampleRate, interval } }) {
  console.log(
    `worker--fft.js - bufferLength: ${pcm.byteLength}, interval: ${interval}`
  );

  updateStatus({
    stage: "Initialising",
  });

  const intervalInSeconds = interval / 1000;

  const audio = new Float32Array(pcm);

  const totalSamples = audio.length;

  const temp = new Float32Array(length / 2);
  const freqDatas = [];

  const samplesPerInterval = sampleRate * intervalInSeconds;

  for (
    let intervalStart = 0;
    intervalStart + samplesPerInterval < totalSamples;
    intervalStart += samplesPerInterval
  ) {
    updateStatus({
      stage: "Analysing interval",
      percentage: intervalStart / totalSamples,
    });

    let count = 0;

    const intervalEnd = intervalStart + samplesPerInterval;

    const freqData = new Float32Array(length / 2);

    for (
      let windowStart = intervalStart;
      windowStart + length < intervalEnd;
      windowStart += length
    ) {
      const windowEnd = windowStart + length;

      const sliced = audio.slice(windowStart, windowEnd);

      calculateFrequencyData(sliced, temp);

      count++;

      for (let i = 0; i < length; i++) {
        freqData[i] += temp[i];
      }
    }

    for (let i = 0; i < length; i++) {
      freqData[i] /= count;
    }

    freqDatas.push(freqData);
  }

  const fftBuffers = freqDatas.map((fd) => fd.buffer);

  postMessage(fftBuffers, fftBuffers);
};
