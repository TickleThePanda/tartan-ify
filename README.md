[Tartan-ify] visualises the similarities within a single piece of music
in a [self-similarity matrix].

This was inspired by [Song Sim] and I built it (but since extended it) at [Hackference].

### How it works

Firstly, all of the processing happens in your browser.

Tartan-ify divides the music into segments and compares each segment
against every other segment. The comparisons are shown in a matrix with
both axes donoting time and the colour denoting the difference between
the segments at those times.

Tartan-ify does the comparison by analysing the spectrum of each segment
using a [Fast Fourier Transform], and then taking the sum of the difference of the power of each frequency between the segments.

### Architecture

Tartan-ify is built with web technologies and utilises [Web Workers] for the heavier
workloads.

### Building

Requirements:
 - Install Node.js and NPM

To build, run:
1. Install the dependencies
   ```
   npm install
   ```
2. Build the site
   ```
   npm run build
   ```

### Deploying

This will build a static site to `_site`. As `SharedArrayBuffer`s are used, you
need to have the right headers for security for the site to work.

### Developing

Run the following command to build and then rebuild on any changes. This hosts
the built content in a local web browser on `https://localhost:8080/`
```
npm run dev
```

[Tartan-ify]: https://tartan-ify.ticklethepanda.co.uk/
[self-similarity matrix]: https://en.wikipedia.org/wiki/Self-similarity_matrix
[Song Sim]: https://colinmorris.github.io/SongSim/
[Hackference]: https://2018.hackference.co.uk/
[Web Workers]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
[Fast Fourier Transform]: https://en.wikipedia.org/wiki/Fast_Fourier_transform
