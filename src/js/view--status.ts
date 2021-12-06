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

type StatusFunction = {
  type: StatusType,
  status: string,
  task: string,
  percentage: number,
  context: string
}

export class StatusView {

  #wrapper;
  #statusElement;
  #taskElement;
  #percentageElement;
  #contextElement;

  #statusFunction;
  #shouldContinue = false;

  constructor(
    {
      wrapper,
      status,
      context,
      task,
      percentage
    }: StatusManagerElementsArgs,
    statusFunction: () => StatusFunction
  ) {
    this.#wrapper = wrapper;
    this.#statusElement = status;
    this.#taskElement = task;
    this.#percentageElement = percentage;
    this.#contextElement = context;
    this.#statusFunction = statusFunction;
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
      const { type, context, status, task, percentage } = this.#statusFunction();
      if (status !== null && status !== undefined) {
        this.#statusElement.innerHTML = status;
      } else {
        this.#statusElement.innerHTML = "";
      }
      if (task !== null && task !== undefined) {
        this.#taskElement.innerHTML = task;
      } else {
        this.#taskElement.innerHTML = "";
      }
      if (percentage !== null && percentage !== undefined) {
        this.#percentageElement.innerHTML = `${Math.floor(percentage * 100)}%`;
      } else {
        this.#percentageElement.innerHTML = "";
      }

      if (context !== null && context !== undefined) {
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
