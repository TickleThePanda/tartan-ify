import { TaskWithStatus } from "./lib--task-promise-worker";
import { StatusType } from "./view--status";

export type CurrentStatus = {
  type?: StatusType,
  status?: string,
  task?: string,
  percentage?: number,
  context?: string
}

type StageUpdateArgs = {
  status: string,
  task?: TaskWithStatus
}

export class MutableStatus {
  status: string | undefined = undefined;
  context: string | undefined = undefined;
  task: TaskWithStatus | undefined = undefined;
  error: string | undefined = undefined;

  constructor() {}

  updateContext(context?: string) {
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

  get(): CurrentStatus {
    if (this.error !== undefined) {
      return {
        context: this.context,
        status: this.error,
        type: StatusType.ERROR
      };
    }

    if (this.status === undefined) {
      return {
        context: this.context,
        status: 'Loading...'
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
