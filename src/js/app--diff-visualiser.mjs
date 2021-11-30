import { TaskPromiseWorker } from './lib--task-promise-worker.mjs';

export class DiffVisualiser {
  constructor({
    colors,
    context
  }) {
    this.context = context;
    this.colors = colors;
  }

  async renderVisualisation({
    diffs, thresholds, scale, updateStatus
  }) {

    const task = new TaskPromiseWorker('/js/worker--renderer.js');

    updateStatus({
      status: 'Generating visualisation ',
      task
    });

    const data = await task
      .run({
        diffs: diffs.buffer,
        colors: this.colors,
        thresholds,
        scale
      });

    const array = new Uint8ClampedArray(data);

    const widthFromRender = Math.sqrt(array.length / 4);

    const image = this.context.createImageData(widthFromRender, widthFromRender);

    image.data.set(array);

    const imageData = await createImageBitmap(image, 0, 0, widthFromRender, widthFromRender);

    return imageData;
  }
}

