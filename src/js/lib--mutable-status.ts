import { TaskWithStatus } from "./lib--task-promise-worker";

type StageUpdateArgs = {
  status: string,
  task?: TaskWithStatus
}

export class MutableStatus {
  status: string;
  context: string;
  task: TaskWithStatus;
  error: string;

  constructor() {}

  updateContext(context: string) {
    this.context = context;
  }

  update({
    status,
    task
  }: StageUpdateArgs) {
    this.status = status;
    this.task = task;
    this.error = undefined;
  }

  updateError(error: string) {
    this.status = undefined;
    this.task = undefined;
    this.error = error;
  }

  get() {
    if (this.error !== undefined) {
      return {
        context: this.context,
        status: this.error,
        type: 'error'
      };
    }

    if (this.status === undefined) {
      return {
        context: this.context,
        text: 'Loading...'
      };
    }

    if (this.task === undefined || this.task.status === undefined) {
      return {
        context: this.context,
        status: this.status
      };
    }

    return {
      context: this.context,
      status: this.status,
      task: this.task.status.stage,
      percentage: this.task.status.percentage
    }
  }
}
