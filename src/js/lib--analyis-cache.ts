import { openDB, DBSchema } from 'idb';
import { BpmOptions } from './view--analysis-form';

const STORE_NAME = 'analysis-store';

interface AnalysisDatabaseSchema extends DBSchema {
  'analysis-store': {
    key: string;
    value: AnalysisCacheResult;
    indexes: {
      'by-hash': string
      'by-created': string
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

type InternalAnalysisCacheValue = AnalysisCacheValue & {
  created: Date
}

export type AnalysisCacheValue = {
  image: Blob,
  trackName: string
}

export type AnalysisCacheResult = InternalAnalysisCacheValue & AnalysisCacheKey;

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


const db = openDB<AnalysisDatabaseSchema>(STORE_NAME, 5, {
  upgrade(db, ov, _nv, transaction) {
    const oldVersion = ov === undefined ? 0 : ov;

    switch (oldVersion) {
      case 0:
        db.createObjectStore(STORE_NAME);
      case 1:
        const addHashIndexStore = transaction.objectStore(STORE_NAME);
        addHashIndexStore.createIndex('by-hash', 'trackHash', {
          unique: false
        });
      case 2:
        transaction.objectStore(STORE_NAME).clear();
      case 3:
        const addLastAccessedStore = transaction.objectStore(STORE_NAME);
        addLastAccessedStore.createIndex('by-created', 'created', {
          unique: false
        })
      case 4:
        transaction.objectStore(STORE_NAME).clear();
    }

  },
});

export class AnalysisStore {

  async get(key: AnalysisCacheKey): Promise<AnalysisCacheResult | undefined> {
    return await (await db).get(STORE_NAME, await hashKey(key));
  }

  async computeIfAbsent(
    key: AnalysisCacheKey,
    supplier: () => Promise<AnalysisCacheValue>
  ): Promise<AnalysisCacheValue> {
    const cachedValue = await this.get(key);

    if (cachedValue !== undefined) {
      return cachedValue;
    }

    const actualValue = await supplier();
    await this.store(key, actualValue);
    return {
      ...key,
      ...actualValue
    }
  }

  async store(key: AnalysisCacheKey, val: AnalysisCacheValue): Promise<AnalysisCacheResult> {
    const fullValue = {
      ...key,
      ...val,
      created: new Date()
    };

    await (await db)
      .put(STORE_NAME, fullValue,
        await hashKey(key)
      );

    return fullValue;
  }

  async getAllByCreationDate(): Promise<AnalysisCacheResult[]> {
    return (await db).getAllFromIndex('analysis-store', 'by-created', undefined);
  }

  async clear() {
    return (await db).clear(STORE_NAME);
  }
}
