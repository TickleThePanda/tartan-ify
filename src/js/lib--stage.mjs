
export class Stage {
  status;
  task;
  error;

  constructor() {}

  update({
    status,
    task
  }) {
    this.status = status;
    this.task = task;
    this.error = undefined;
  }

  updateError(error) {
    this.status = undefined;
    this.task = undefined;
    this.error = error;
  }

  get() {
    if (this.error !== undefined) {
      return {
        status: this.error,
        type: 'error'
      };
    }

    if (this.status === undefined) {
      return {
        text: 'Loading...'
      };
    }

    if (this.task === undefined || this.task.status === undefined) {
      return {
        status: this.status
      };
    }

    return {
      status: this.status,
      task: this.task.status.stage,
      percentage: this.task.status.percentage
    }
  }
}
