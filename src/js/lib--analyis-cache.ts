import { openDB, DBSchema } from 'idb';
import { BpmOptions } from './view--analysis-form';

const STORE_NAME = 'analysis-store';

interface AnalysisDatabaseSchema extends DBSchema {
  'analysis-store': {
    key: string;
    value: AnalysisCacheValue;
    indexes: {
      'by-hash': string
    }
  };
}

export type AnalysisCacheKey = {
  minThreshold: number;
  maxThreshold: number;
  scale: string;
  bpmOptions: BpmOptions;
  diffColor: string;
  similarColor: string;
  trackHash: string;
}

type AnalysisCacheValue = {
  image: Uint8ClampedArray
} & AnalysisCacheKey;

async function hashKey(key: AnalysisCacheKey): Promise<string> {
  const {
    minThreshold,
    maxThreshold,
    scale,
    bpmOptions: {
      value: bpmValue,
      autodetect: bpmAutoDetect,
      autodetectMultiplier: bpmAutoDetectMultiplier
    },
    diffColor,
    similarColor,
    trackHash
  } = key;

  const subset = {
    minThreshold,
    maxThreshold,
    scale,
    bpmValue,
    bpmAutoDetect,
    bpmAutoDetectMultiplier,
    diffColor,
    similarColor,
    trackHash
  };

  const json = JSON.stringify(subset);
  const jsonBuffer = new TextEncoder().encode(json);

  const hashBuffer = await crypto.subtle.digest('SHA-1', jsonBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  const array = Array.from(hashArray);

  return array.map(b => b.toString(16).padStart(2, '0')).join('');
}

const db = openDB<AnalysisDatabaseSchema>(STORE_NAME, 1, {
  upgrade(db) {
    const store = db.createObjectStore(STORE_NAME);
    store.createIndex('by-hash', 'trackHash', {
      unique: false
    });
  },
});

export class AnalysisStore {

  async get(key: AnalysisCacheKey): Promise<AnalysisCacheValue | undefined> {
    return await (await db).get(STORE_NAME, await hashKey(key))
  }

  async computeIfAbsent(key: AnalysisCacheKey, supplier: () => Promise<Uint8ClampedArray>): Promise<AnalysisCacheValue> {
    const cachedValue = await this.get(key);

    if (cachedValue !== undefined) {
      return cachedValue;
    }

    const actualValue = await supplier();
    await this.store(key, actualValue);
    return {
      ...key,
      image: actualValue
    }
  }
  async store(key: AnalysisCacheKey, val: Uint8ClampedArray): Promise<AnalysisCacheValue> {
    const fullValue = {
      ...key,
      image: val
    };

    await (await db)
      .put(STORE_NAME, fullValue,
        await hashKey(key)
      );

    return fullValue;
  }

  async clear() {
    return (await db).clear(STORE_NAME);
  }
}
