export class ColorManager {
  constructor(visualiser) {
    this.visualiser = visualiser;
  }
  getColors() {

    const computedStyle = getComputedStyle(visualiser);

    return {
      diff: computedStyle.getPropertyValue('--color-diff'),
      similar: computedStyle.getPropertyValue('--color-similar'),
      primary: computedStyle.getPropertyValue('--palette-primary'),
      secondary: computedStyle.getPropertyValue('--palette-secondary')
    };
  }
}