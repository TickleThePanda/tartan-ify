export class StatusManager {
  element;
  #statusFunction;
  #shouldContinue = false;
  constructor({
    wrapper,
    status,
    task,
    percentage
  }, statusFunction) {
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

      if (type === 'error') {
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
