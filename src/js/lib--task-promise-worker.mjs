class Status {
  stage = null;
  percentage = null;

  constructor() {}

  update({
    stage,
    percentage
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
