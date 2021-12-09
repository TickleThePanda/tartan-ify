importScripts('lib--bpm.js');

onmessage = function ({ data: pcm }) {

  console.log(`worker--tempo.js - bufferLength: ${pcm.byteLength}`);

  updateStatus({
    stage: "Initialising"
  });

  const mt = new MusicTempo(new Float32Array(pcm));

  postMessage({
    tempo: mt.tempo,
    beats: mt.beats,
  });
};
