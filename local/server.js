const express = require('express');
const path = require('path');

const app = express();

app.use((req, res, next) => {
  res.set("Cross-Origin-Embedder-Policy", "require-corp");
  res.set("Cross-Origin-Opener-Policy", "same-origin");
  res.set("Cache-Control", "no-store");
  next();
});

app.use(express.static(path.join(__dirname, '../_site')));

app.listen(8080);