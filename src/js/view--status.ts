type StatusManagerElementsArgs = {
  wrapper: HTMLElement,
  status: HTMLElement,
  task: HTMLElement,
  percentage: HTMLElement
}

export enum StatusType {
  "ERROR"
}

type StatusFunction = {
  type: StatusType,
  status: string,
  task: string,
  percentage: number
}

export class StatusView {

  element;
  statusElement;
  taskElement;
  percentageElement;

  #statusFunction;
  #shouldContinue = false;

  constructor(
    {
      wrapper,
      status,
      task,
      percentage
    }: StatusManagerElementsArgs,
    statusFunction: () => StatusFunction
  ) {
    this.element = wrapper;
    this.statusElement = status;
    this.taskElement = task;
    this.percentageElement = percentage;
    this.#statusFunction = statusFunction;
  }

  get visible() {
    return !this.element.classList.contains('hidden');
  }

  set visible(isVisible) {
    if (isVisible) {
      this.element.classList.remove('hidden');
    } else {
      this.element.classList.add('hidden');
    }
  }

  start() {
    this.#shouldContinue = true;

    const updateStatus = () => {
      const { type, status, task, percentage } = this.#statusFunction();
      if (status !== null && status !== undefined) {
        this.statusElement.innerHTML = status;
      } else {
        this.statusElement.innerHTML = "";
      }
      if (task !== null && task !== undefined) {
        this.taskElement.innerHTML = task;
      } else {
        this.taskElement.innerHTML = "";
      }
      if (percentage !== null && percentage !== undefined) {
        this.percentageElement.innerHTML = `${Math.floor(percentage * 100)}%`;
      } else {
        this.percentageElement.innerHTML = "";
      }

      if (type === StatusType.ERROR) {
        this.element.classList.add('error');
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
