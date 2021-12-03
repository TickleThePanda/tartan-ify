type BpmCacheArgs = {
  version: string
}

export class BpmCache {

  #version;

  constructor({
    version
  }: BpmCacheArgs) {
    this.#version = version;
  }

  get(hash: string): number | null {
    const storedBpm = localStorage.getItem(`bpm-${this.#version}-${hash}`);
    if (storedBpm !== null) {
      return parseFloat(storedBpm);
    } else {
      return null;
    }
  }

  set(hash: string, bpm: number) {
    localStorage.setItem("bpm-v1-" + hash, bpm.toString());
  }

}