export class StatusManager {
  element;
  #statusFunction;
  #shouldContinue = false;
  constructor(element, statusFunction) {
    this.element = element;
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
      const { text, type } = this.#statusFunction();
      this.element.innerHTML = text;

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
