window.addEventListener('load', e => {
  const inputs = document.querySelectorAll('.js-file-upload-input');
  for (let input of inputs) {
    const inputId = input.id;
    const fileNameLabel = Array.from(document.querySelectorAll('.js-file-upload-name')).find(e => e.dataset["for"] === inputId);
    console.log(input, fileNameLabel);
    input.addEventListener('change', (e) => {
      const file = input.files[0];
      if (file !== undefined) {
        fileNameLabel.innerHTML = file.name;
      }
    })
  }
})