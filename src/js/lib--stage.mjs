
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
        text: this.error,
        type: 'error'
      };
    } else if (this.status !== undefined) {
      if (this.task === undefined) {
        return {
          text: this.status
        };
      } else {
        const taskStatusText = this.task.status.toString();
        if (taskStatusText !== "") {
          return {
            text: `${this.status}<br>${taskStatusText}%`
          };
        } else {
          return {
            text: this.status
          };
        }
      }
    } else {
      return {
        text: 'Loading...'
      };
    }
  }
}
