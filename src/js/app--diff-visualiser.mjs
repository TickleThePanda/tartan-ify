import { TaskPromiseWorker } from './lib--task-promise-worker.mjs';

export class DiffVisualiser {
  constructor({
    colors,
    context,
    updateStatus
  }) {
    this.context = context;
    this.colors = colors;
    this.updateStatus = updateStatus;
  }

  async renderVisualisation({
    diffs, thresholds, scale
  }) {

    const task = new TaskPromiseWorker('/js/worker--renderer.js');

    this.updateStatus({
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

  async renderVisualisations({
    diffs, matrixParams
  }) {

    const task = new TaskPromiseWorker('/js/worker--renderer.js');

    this.updateStatus({
      status: 'Generating visualisations',
      task
    });

    const results = await task
      .run({
        diffs: diffs.buffer,
        colors: this.colors,
        matrixParams
      });

    return await Promise.all(results.map(async ({data, title}) => {
      const array = new Uint8ClampedArray(data);

      const widthFromRender = Math.sqrt(array.length / 4);

      const image = this.context.createImageData(widthFromRender, widthFromRender);

      image.data.set(array);

      return {
        title,
        imageData: await createImageBitmap(image, 0, 0, widthFromRender, widthFromRender)
      }
    }));

  }
}

