export function handleMultiSelectElements(): void {
  const watchers = document.querySelectorAll(".js-last-selected-value");

  for (const watcher of <HTMLElement[]>Array.from(watchers)) {
    const form = <HTMLFormElement>watcher.closest("form");

    if (form === undefined) {
      throw new Error("Unable to find form");
    }

    const directInputs =
      watcher.dataset["for"]
        ?.split(/\s+/gi)
        .map((i) => <HTMLInputElement>form.querySelector("#" + i)) ?? [];

    const formGroupInputs =
      watcher.dataset["forNames"]
        ?.split(/\s+/gi)
        .flatMap(
          (i) =>
            <HTMLInputElement[]>(
              Array.from(form.querySelectorAll("[name=" + i + "]"))
            )
        ) ?? [];

    const inputs: HTMLInputElement[] = [...directInputs, ...formGroupInputs];

    const setWatcherValue = (v: string | null) =>
      v !== null ? (watcher.innerHTML = v) : null;

    for (const input of inputs) {
      const handler = getInputHandler(form, input);

      const handleChange = () => {
        if (handler.isSelected()) {
          setWatcherValue(handler.getNiceValue());

          for (const inputToReset of inputs.filter((e) => e !== input)) {
            const inputToResetHandler = getInputHandler(form, inputToReset);

            inputToResetHandler.reset();
          }
        }
      };

      input.addEventListener("click", handleChange);
      input.addEventListener("change", handleChange);

      if (handler.isSelected()) {
        setWatcherValue(handler.getNiceValue());
      }
    }
  }
}

function getInputHandler(
  form: HTMLFormElement,
  input: HTMLInputElement
): InputHandler {
  const inputHandlers: InputHandlers = {
    file: (_, i) => ({
      isSelected: () => i.value !== "" || (i.files?.length ?? 0) > 0,
      reset: () => (i.value = ""),
      getNiceValue: () =>
        i.files?.length === 1
          ? i.files[0]?.name ??
            (() => {
              throw new Error("Unable to get file to show name");
            })()
          : (i.files?.length ?? 0) > 0
          ? `${i.files?.length} files selected`
          : null,
    }),
    radio: (form, i) => ({
      isSelected: () => i.checked,
      reset: () => (i.checked = false),
      getNiceValue: () =>
        form.querySelector('label[for="' + i.id + '"]')?.textContent ?? null,
    }),
    text: (_, i) => ({
      isSelected: () => i.value !== "",
      reset: () => (i.value = ""),
      getNiceValue: () => i.value,
    }),
  };

  const type = input.type?.toLowerCase();
  const handler = inputHandlers[type];
  if (handler === undefined) {
    throw new Error("No handler for " + type);
  } else {
    return handler(form, input);
  }
}

type InputHandlers = Record<string, InputHandlerCreator>;
type InputHandlerCreator = (
  form: HTMLFormElement,
  input: HTMLInputElement
) => InputHandler;

type InputHandler = {
  isSelected: () => boolean;
  reset: () => void;
  getNiceValue: () => string | null;
};
