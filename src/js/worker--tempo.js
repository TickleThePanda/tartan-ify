importScripts('lib--bpm.js');

onmessage = function ({ data: buffers }) {

  console.log(`worker--tempo.js - nBuffers: ${buffers.length}, bufferLength: ${buffers[0].byteLength}`);

  updateStatus({
    stage: "Initialising"
  });

  let audioData = null;
  if (buffers.length == 2) {
    audioData = new Float32Array(new ArrayBuffer(buffers[0].byteLength));
    const channel1Data = new Float32Array(buffers[0]);
    const channel2Data = new Float32Array(buffers[1]);
    const length = channel1Data.length;
    console.log(length);
    for (let i = 0; i < length; i++) {
      audioData[i] = (channel1Data[i] + channel2Data[i]) / 2;
    }
  } else {
    audioData = buffers[0];
  }

  const mt = new MusicTempo(audioData);

  postMessage({
    tempo: mt.tempo,
    beats: mt.beats,
  });
};
