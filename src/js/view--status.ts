import { MutableStatus } from "./lib--mutable-status";

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
