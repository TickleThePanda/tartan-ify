import { convertImage } from "./lib--image-data-to-bitmap";
import { VisView } from "./view--vis-view";

export type BatchImage = {
  title: string | {
    header: string,
    context: Record<string, string>
  },
  imageData: Uint8ClampedArray
}

export class BatchVisualisationPainter implements VisView {
  element;
  constructor(
    element: HTMLElement
  ) {
    this.element = element;
  }

  async start(
    images: BatchImage[],
    heading: string
  ) {

    const headingElement = document.getElementById('batch-page-header') ?? (() => {throw new Error("Unable to find batch page header")})();
    headingElement.innerHTML = heading;

    for (let { title, imageData: image  } of images) {

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d') ?? (() => {throw new Error("Unable to get context")})();

      const imageData = await convertImage(context, image);
      const div = document.createElement('div');
      div.className = 'batch--item';

      const imageWidth = imageData.width;
      const currentMagnitude = Math.ceil(Math.log2(imageWidth));
      const minMagnitude = Math.ceil(Math.log2(1000));
      const canvasSize = imageWidth > 1000
          ? imageWidth
          : Math.pow(2, minMagnitude - currentMagnitude) * imageWidth;

      canvas.width = canvasSize;
      canvas.height = canvasSize;

      const heading = document.createElement('h3');
      heading.innerHTML = typeof title === 'string' ? title : title.header;

      div.appendChild(heading);

      if (typeof title !== 'string') {
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.innerHTML = "Details"
        const detailsList = document.createElement('ul');

        details.appendChild(summary);
        details.appendChild(detailsList);
        for (const [k, v] of Object.entries(title.context)) {
          const el = document.createElement('li');
          el.innerHTML = `${k}: ${v}`;

          detailsList.appendChild(el);
        }

        div.appendChild(details);
      }

      div.appendChild(canvas);
      this.element.appendChild(div);

      context.imageSmoothingEnabled = false;
      context.drawImage(imageData, 0, 0, canvas.width, canvas.height);

    }
  }

  show() {
    this.element.classList.remove("hidden");
  }
}