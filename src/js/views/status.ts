export type StatusValues = {
  stage?: string;
  percentage?: number;
}

export class Status implements StatusValues {
  stage?: string = undefined;
  percentage?: number = undefined;

  constructor() {}

  update({
    stage,
    percentage
  }: {
    stage: string,
    percentage: number
  }) {
    this.stage = stage;
    this.percentage = percentage;
  }
}

export interface TaskWithStatus {
  readonly status: StatusValues;
}

export type CurrentStatus = {
  status?: string,
  type?: StatusType,
  task?: string,
  context?: string
} & StatusValues

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



type StatusManagerElementsArgs = {
  wrapper: HTMLElement,
  status: HTMLElement,
  task: HTMLElement,
  percentage: HTMLElement,
  context: HTMLElement
}

export enum StatusType {
  "ERROR"
}

export class StatusView {

  #wrapper;
  #statusElement;
  #taskElement;
  #percentageElement;
  #contextElement;

  #statusManager;
  #shouldContinue = false;

  constructor(
    {
      wrapper,
      status,
      context,
      task,
      percentage
    }: StatusManagerElementsArgs,
    statusManager: MutableStatus
  ) {
    this.#wrapper = wrapper;
    this.#statusElement = status;
    this.#taskElement = task;
    this.#percentageElement = percentage;
    this.#contextElement = context;
    this.#statusManager = statusManager;
  }

  get visible() {
    return !this.#wrapper.classList.contains('hidden');
  }

  set visible(isVisible) {
    if (isVisible) {
      this.#wrapper.classList.remove('hidden');
    } else {
      this.#wrapper.classList.add('hidden');
    }
  }

  start() {
    this.#shouldContinue = true;

    const updateStatus = () => {
      const { type, context, status, task, percentage } = this.#statusManager.get();
      if (status !== undefined) {
        this.#statusElement.innerHTML = status;
      } else {
        this.#statusElement.innerHTML = "";
      }
      if (task !== undefined) {
        this.#taskElement.innerHTML = task;
      } else {
        this.#taskElement.innerHTML = "";
      }
      if (percentage !== undefined) {
        this.#percentageElement.innerHTML = `${Math.floor(percentage * 100)}%`;
      } else {
        this.#percentageElement.innerHTML = "";
      }

      if (context !== undefined) {
        this.#contextElement.innerHTML = context;
      } else {
        this.#contextElement.innerHTML = "";
      }

      if (type === StatusType.ERROR) {
        this.#wrapper.classList.add('error');
      }

      if (this.#shouldContinue) {
        requestAnimationFrame(updateStatus);
      }
    };

    requestAnimationFrame(updateStatus);
  }

  stop() {
    this.#shouldContinue = false;
  }

}
