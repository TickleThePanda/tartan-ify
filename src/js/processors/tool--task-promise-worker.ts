import { Status, TaskWithStatus } from "../views/status";

export class TaskPromiseWorker implements TaskWithStatus {
  #status = new Status();

  stringUrl: string;

  constructor(stringUrl: string) {
    this.stringUrl = stringUrl;
  }

  async run(message: any, transfer?: Transferable[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(this.stringUrl);
      worker.onmessage = (m) => {
        if (m.data instanceof Object && m.data.type === "status") {
          this.#status.update({
            stage: m.data.stage,
            percentage: m.data.percentage,
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
      worker.postMessage(message, transfer ?? []);
    });
  }

  get status() {
    return this.#status;
  }
}
