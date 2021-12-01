export class BatchVisualisationPainter {
  constructor(element, images) {
    this.element = element;
    this.images = images;
  }

  start() {

    for (let { title, imageData } of this.images) {
      const div = document.createElement('div');
      div.className = 'batch--item';

      const canvas = document.createElement('canvas');

      const imageWidth = imageData.width;
      const currentMagnitude = Math.ceil(Math.log2(imageWidth));
      const minMagnitude = Math.ceil(Math.log2(1000));
      const canvasSize = imageWidth > 1000
          ? imageWidth
          : Math.pow(2, minMagnitude - currentMagnitude) * imageWidth;

      canvas.width = canvasSize;
      canvas.height = canvasSize;

      const heading = document.createElement('h3');
      heading.innerHTML = title;

      div.appendChild(heading);
      div.appendChild(canvas);
      this.element.appendChild(div);

      const context = canvas.getContext('2d');
      context.imageSmoothingEnabled = false;
      context.drawImage(imageData, 0, 0, canvas.width, canvas.height);
    }
  }
}