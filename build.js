const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const postcss = require("postcss");
const cssImport = require("postcss-import");
const cssnano = require("cssnano");
const webpack = require("webpack");

const isPreview = process.argv.includes("--preview");

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

async function buildCSS() {
  console.log("[build] Processing CSS...");
  const input = fs.readFileSync("./src/css/main.css", "utf8");
  const result = await postcss([
    cssImport({ from: "./src/css/main.css" }),
    cssnano({ preset: "default" }),
  ]).process(input, { from: "./src/css/main.css", to: "./dist/css/main.css" });

  fs.mkdirSync("./dist/css", { recursive: true });
  fs.writeFileSync("./dist/css/main.css", result.css);
  console.log("[build] CSS done.");
}

function buildJS() {
  return new Promise((resolve, reject) => {
    console.log("[build] Bundling JS...");
    const config = {
      mode: "production",
      context: path.resolve(__dirname, "src"),
      entry: { app: ["./js/app"] },
      output: {
        path: path.resolve(__dirname, "dist"),
        publicPath: "/",
        filename: "[name].js",
      },
      module: {
        rules: [
          {
            test: /\.js$/,
            exclude: /node_modules/,
            use: { loader: "babel-loader", options: { cacheDirectory: true } },
          },
        ],
      },
    };

    webpack(config, (err, stats) => {
      if (err) return reject(err);
      if (stats.hasErrors()) {
        console.error(stats.toString({ colors: true }));
        return reject(new Error("Webpack build failed"));
      }
      console.log("[build] JS done.");
      resolve();
    });
  });
}

function buildHugo() {
  console.log("[build] Running Hugo...");
  const platform = process.platform === "win32" ? "exe" : process.platform === "darwin" ? "darwin" : "linux";
  const hugoBin = `./bin/hugo.${platform}`;
  const args = ["-d", "../dist", "-s", "site"];
  if (isPreview) {
    args.push("--buildDrafts", "--buildFuture");
  }
  run(`${hugoBin} ${args.join(" ")}`);
  console.log("[build] Hugo done.");
}

async function main() {
  console.log(`[build] Starting ${isPreview ? "preview" : "production"} build...`);
  fs.mkdirSync("./dist", { recursive: true });

  buildHugo();
  await buildCSS();
  await buildJS();

  console.log("[build] Complete!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
