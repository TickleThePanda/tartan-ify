type StatusValues = {
  stage?: string;
  percentage?: number;
}

class Status implements StatusValues {
  stage?: string = null;
  percentage?: number = null;

  constructor() {}

  update({
    stage,
    percentage
  }: {
    stage: string,
    percentage: number
  }) {
    if (stage === undefined || percentage === null) {
      this.stage = null;
    } else {
      this.stage = stage;
    }
    if (percentage === undefined || percentage === null) {
      this.percentage = null
    } else {
      this.percentage = percentage;
    }
  }
}

export interface TaskWithStatus {
  readonly status: StatusValues;
}

export class TaskPromiseWorker implements TaskWithStatus {
  #status = new Status();

  stringUrl: string;

  constructor(stringUrl: string) {
    this.stringUrl = stringUrl;
  }

  async run(message: any, transfer?: Transferable[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(this.stringUrl);
      worker.onmessage = m => {
        if (m.data instanceof Object && m.data.type === 'status') {
          this.#status.update({
            stage: m.data.stage,
            percentage: m.data.percentage
          });
        } else {
          resolve(m.data);
          worker.terminate();
        }
      };
      worker.onerror = (event) => {
        reject(event.message);
        worker.terminate();
      };
      worker.postMessage(message, transfer);
    });
  }

  get status() {
    return this.#status;
  }
}
