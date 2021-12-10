type BpmCacheArgs = {
  version: string;
};

export class BpmCache {
  #version;

  constructor({ version }: BpmCacheArgs) {
    this.#version = version;
  }

  get(hash: string): number | null {
    const storedBpm = localStorage.getItem(this.toKey(hash));
    if (storedBpm !== null) {
      return parseFloat(storedBpm);
    } else {
      return null;
    }
  }

  set(hash: string, bpm: number) {
    localStorage.setItem(this.toKey(hash), bpm.toString());
  }

  private toKey(hash: string) {
    return `bpm-${this.#version}-${hash}`;
  }
}
