const fs = require("node:fs");
const path = require("node:path");
const process = require("node:process");
// const { run } = require("../mylang2/dist/src/utils/utils");
const { run } = require("mylang");

const { base } = path.parse(process.cwd());

const file = fs.readFileSync("index.ml").toString();

try {
  run(file, {
    base: process.cwd(),
    main: path.join(base, "index.ml"),
  });
} catch (err) {
  console.log(err.toString());
}
