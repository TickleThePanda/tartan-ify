class Status {
  stage = null;
  percentage = null;

  constructor() {}

  toString() {
    if (this.stage !== null && this.percentage !== null) {
      return `${this.stage} - ${Math.floor(this.percentage * 100)}`
    } else {
      return "";
    }
  }

  update({
    stage,
    percentage
  }) {
    this.stage = stage;
    this.percentage = percentage;
  }
}

export class TaskPromiseWorker {
  #status = new Status();
  constructor(stringUrl) {
    this.stringUrl = stringUrl;
  }

  async run(message, transfer) {
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
