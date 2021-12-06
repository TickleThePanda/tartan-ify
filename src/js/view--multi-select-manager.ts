export function handleMultiSelectElements() {

  const watchers = document.querySelectorAll('.js-last-selected-value');

  for (let watcher of <HTMLElement[]> Array.from(watchers)) {
    const form = <HTMLFormElement> watcher.closest('form');

    const directInputs = watcher
      .dataset["for"]
      .split(/\s+/gi)
      .map(i => <HTMLInputElement> form.querySelector("#" + i));

    const formGroupInputs = watcher
      .dataset["forNames"]
      .split(/\s+/gi)
      .flatMap(i => <HTMLInputElement[]> Array.from(form.querySelectorAll("[name=" + i + "]")));

    const inputs: HTMLInputElement[] = [... directInputs, ...formGroupInputs];

    const setWatcherValue = (v: string) => v !== null ? watcher.innerHTML = v : null;

    for (let input of inputs) {
      const handler = getInputHandler(form, input);

      const handleChange = () => {

        if (handler.isSelected()) {
          setWatcherValue(handler.getNiceValue());

          for (let inputToReset of inputs.filter(e => e !== input)) {
            const inputToResetHandler = getInputHandler(form, inputToReset);

            inputToResetHandler.reset();
          }
        }
      };

      input.addEventListener('click', handleChange);
      input.addEventListener('change', handleChange);

      if (handler.isSelected()) {
        setWatcherValue(handler.getNiceValue());
      }
    }

  }
}


function getInputHandler(form: HTMLFormElement, input: HTMLInputElement): InputHandler {

  const inputHandlers: InputHandlers = {
    file: (_, i) => ({
      isSelected: () => i.value !== '' || i.files.length > 0,
      reset: () => i.value = null,
      getNiceValue: () => i.files.length === 1 ?
                            i.files[0].name :
                          i.files.length > 0 ?
                            `${i.files.length} files selected` :
                            null,
    }),
    radio: (form, i) => ({
      isSelected: () => i.checked,
      reset: () => i.checked = false,
      getNiceValue: () => form.querySelector('label[for="' + i.id + '"]').textContent,
    }),
    text: (_, i) => ({
      isSelected: () => i.value !== '',
      reset: () => i.value = null,
      getNiceValue: () => i.value,
    }),
  }

  return inputHandlers[input.type.toLowerCase()](form, input);

}

type InputHandlers = Record<string, InputHandlerCreator>;
type InputHandlerCreator = (form: HTMLFormElement, input: HTMLInputElement) => InputHandler;

type InputHandler = {
  isSelected: () => boolean,
  reset: () => any,
  getNiceValue: () => string
};

