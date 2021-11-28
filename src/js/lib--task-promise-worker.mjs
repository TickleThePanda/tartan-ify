export class TaskPromiseWorker {
  constructor(stringUrl) {
    this.stringUrl = stringUrl;
  }

  async run(message, transfer) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(this.stringUrl);
      worker.onmessage = m => {
        resolve(m.data);
        worker.terminate();
      };
      worker.onerror = (event) => {
        reject(event.message);
        worker.terminate();
      };
      worker.postMessage(message, transfer);
    });
  }
}