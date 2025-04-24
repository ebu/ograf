const fs = require("fs");
const path = require("path");

/*
  *************************************************************************************************

  This scripts replaces URLs in the manifest with local paths, for testing purposes.
  Usage:
   * `node scripts/local-testing.js` to replace URLs with local paths
   * `node scripts/local-testing.js --restore` to restore the original URLs
   *

  This is useful when testing the json-manifests locally.
  One simple way to serve the files locally is:
  * `cd ograf`
  * `npm install -g http-server`
  * `http-server -p 8080`  // serves the files on http://localhost:8080

  *************************************************************************************************
  */

let restore = false;
process.argv.forEach((arg) => {
  if (arg === "--restore") restore = true;
});

let replacements = [
  {
    from: "https://ograf.ebu.io/",
    to: "http://localhost:8080/",
  },
];

if (restore) {
  replacements = replacements.map((r) => {
    return {
      from: r.to,
      to: r.from,
    };
  });
}

let updateCount = 0;

async function replaceInAllFiles(folderPath) {
  const files = await fs.promises.readdir(folderPath);

  for (const file of files) {
    if (file === "node_modules") continue;
    if (file === "local-testing.js") continue;
    // Only process these file types:

    const filePath = path.join(folderPath, file);

    // is dir?
    if ((await fs.promises.stat(filePath)).isDirectory()) {
      await replaceInAllFiles(filePath);
    } else {
      // Only process these file types:
      if (
        !file.endsWith(".ts") &&
        !file.endsWith(".js") &&
        !file.endsWith(".json")
      )
        continue;

      const fileContents = await fs.promises.readFile(filePath, "utf-8");

      let newContents = fileContents;

      for (const replacement of replacements) {
        newContents = newContents.replaceAll(replacement.from, replacement.to);
      }

      if (newContents !== fileContents) {
        await fs.promises.writeFile(filePath, newContents);
        console.log(`Updated ${filePath}`);
        updateCount++;
      }
    }
  }
}

const basePath = path.resolve(__dirname, "../..");
replaceInAllFiles(basePath)
  .then(() => {
    if (!restore) {
      console.log(`Updated ${updateCount} files.`);
      console.log("To restore, run `node scripts/local-testing.js --restore`");
    } else {
      console.log(`${updateCount} Files restored`);
    }
  })
  .catch(console.error);
