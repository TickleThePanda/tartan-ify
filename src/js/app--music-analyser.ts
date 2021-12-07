import { BpmCache } from './lib--bpm-cache';
import { TaskPromiseWorker, TaskWithStatus } from './lib--task-promise-worker';
import { BpmOptions } from './view--analysis-form';

type Status = {
  status: string,
  task?: TaskWithStatus
}

type StatusListener = (status: Status) => any

class MusicAnalyser {
  listeners: StatusListener[];
  bpmCache: BpmCache;

  constructor() {
    this.listeners = [];
    this.bpmCache = new BpmCache({
      version: "v1"
    });
  }

  addStatusUpdateListener(listener: StatusListener) {
    this.listeners.push(listener);
  }

  updateStatus(status: Status) {
    this.listeners.forEach(l => l(status));
  }

  async generateDiffMatrix(
    audioFileData: ArrayBuffer,
    bpm: BpmOptions
  ) {

    console.log(`app--music.analyser.mjs - fileDataSize: ${audioFileData.byteLength}, bpm: ${bpm}`);

    const audioData = await this.decodeAudioData(audioFileData);

    const hash = await this.hashAudio(audioData.getChannelData(0));

    const sharedBuffers = convertToSharedBuffers(audioData);
    const sampleRate = audioData.sampleRate;

    const realBpm = await this.calculateBpm({
      buffers: sharedBuffers,
      bpm,
      hash
    });

    const interval = 1000 / (realBpm / 60);

    const fftsForIntervals = await this.calculateFftsForSegments(sharedBuffers, sampleRate, interval);

    const diffs = await this.calculateFftDiffMatrix(fftsForIntervals);

    return {
      diffs,
      audio: audioData,
      bpm: realBpm
    };
  }

  async decodeAudioData(fileBuffer: ArrayBuffer): Promise<AudioBuffer> {

    const length = fileBuffer.byteLength;

    const task: TaskWithStatus = {
      status: {
        percentage: 0
      }
    }

    const start = Date.now();

    this.updateStatus({
      status: 'Decoding audio data',
      task
    });

    const intervalId = setInterval(() => {
      const timeMod = 0.0008;
      const expectedTime = length * timeMod;

      const end = Date.now();

      const diff = end - start;

      task.status.percentage = Math.min(diff / expectedTime, 1);

    }, 100);

    const ctx = new AudioContext();
    const data = await ctx.decodeAudioData(fileBuffer);

    clearInterval(intervalId);

    return data;
  }

  async calculateFftDiffMatrix(ffts: Float32Array[]) {

    const task = new TaskPromiseWorker('/js/workers/w--diff-analysis.js');

    this.updateStatus({
      status: 'Calculating differences between segments',
      task
    });

    const buffers = ffts.map(f => f.buffer);

    const data = await task
      .run(buffers, buffers);

    return new Float32Array(data);
  }

  async calculateFftsForSegments(
    buffers: SharedArrayBuffer[],
    sampleRate: number,
    interval: number
  ): Promise<Float32Array[]> {

    const task = new TaskPromiseWorker('/js/workers/w--fft.js');

    this.updateStatus({
      status: 'Analysing spectrum for each segments',
      task
    });

    const data: ArrayBuffer[] = await task
      .run({
        sampleRate,
        interval,
        buffers
      });

    return data.map(f => new Float32Array(f));

  }

  async calculateBpm({
    buffers, bpm, hash
  }: {
    buffers: SharedArrayBuffer[],
    bpm: BpmOptions,
    hash: string
  }): Promise<number> {

    if (!bpm.autodetect) {
      return bpm.value;
    }

    const storedBpm = this.bpmCache.get(hash);
    if (storedBpm !== null) {
      return storedBpm * bpm.autodetectMultiplier;
    }

    const task = new TaskPromiseWorker('/js/workers/w--tempo.js');

    this.updateStatus({
      status: 'Detecting BPM',
      task
    });

    try {
      const { tempo }: { tempo: number } = await task.run(buffers);

      this.bpmCache.set(hash, tempo);
      return tempo * bpm.autodetectMultiplier;
    } catch (e) {
      if (typeof e === 'string' && e.startsWith('Error: Tempo extraction failed')) {
        const tempo = 113;

        this.bpmCache.set(hash, tempo);
        return tempo * bpm.autodetectMultiplier;
      } else {
        throw e;
      }
    }


  }

  async hashAudio(sharedBuffers: Float32Array) {

    this.updateStatus({
      status: 'Hashing audio'
    });

    const hashBuffer = await crypto.subtle.digest("SHA-1", sharedBuffers);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hash;
  }
}


function convertToSharedBuffers(audioBuffer: AudioBuffer): SharedArrayBuffer[] {
  const converted = [];

  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
    const buffer = audioBuffer.getChannelData(i).buffer;
    converted.push(copyToSharedBuffer(buffer));
  }

  return converted;
}

function copyToSharedBuffer(src: ArrayBuffer): SharedArrayBuffer {
  const dst = new SharedArrayBuffer(src.byteLength);
  new Uint8Array(dst).set(new Uint8Array(src));
  return dst;
}


export { MusicAnalyser };
