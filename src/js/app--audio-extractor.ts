import { MutableStatus } from "./lib--mutable-status";
import { TaskWithStatus } from "./lib--task-promise-worker";

export type Track = {
  audioBuffer: AudioBuffer,
  pcm: SharedArrayBuffer,
  name: string,
  sampleRate: number
}

export class AudioExtractor {
  #status: MutableStatus;

  constructor(status: MutableStatus) {
    this.#status = status;
  }

  async extract(
    audio: ArrayBuffer,
    name: string
  ): Promise<Track> {
    const audioBuffer = await this.decodeAudioData(audio);
    const pcm = await this.combineChannels(audioBuffer);
    return {
      audioBuffer: audioBuffer,
      pcm,
      name,
      sampleRate: audioBuffer.sampleRate
    }
  }


  private async decodeAudioData(fileBuffer: ArrayBuffer): Promise<AudioBuffer> {

    const length = fileBuffer.byteLength;

    const task: TaskWithStatus = {
      status: {
        percentage: 0
      }
    }

    const start = Date.now();

    this.#status.update({
      status: 'Decoding audio data',
      task
    });

    const intervalId = setInterval(() => {
      const timeMod = 0.0005;
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

  private combineChannels(audioBuffer: AudioBuffer) {

    this.#status.update({
      status: 'Combining channels'
    });

    const buffers = [];

    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      buffers.push(audioBuffer.getChannelData(i));
    }

    const channels = buffers.map(b => new Float32Array(b));
    const totalSamples = channels[0].length;
    const byteLength = channels[0].byteLength;

    const buffer = new SharedArrayBuffer(byteLength);

    const combined = new Float32Array(buffer);

    for (let i = 0; i < totalSamples; i++) {
      let sum = 0;
      for (let iC = 0; iC < channels.length; iC++) {
        sum += channels[iC][i];
      }
      combined[i] = sum / channels.length;
    }

    return buffer;
  }
}