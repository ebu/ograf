const { compile, compileFromFile } = require("json-schema-to-typescript");
const path = require("path");
const fs = require("fs");

async function main() {


  const folderPath = path.resolve("./src/generated");
  const filePath = path.join(folderPath, 'server-api.d.ts')
  console.log(`Fixing ${filePath}...`)

  const orgContent = await fs.promises.readFile(filePath, "utf-8");

  let content = orgContent
  // Do some fixes:

  content = content
    // Fixes ts error "Duplicate $defs"
    .replace(`
            $defs?: {
                [key: string]: unknown;
            };`, '')
    // Fixes ts error: "Expression produces a union type that is too complex to represent"
    .replace(`components["schemas"]["format-annotation"] &`, '')



  if (content !== orgContent) {
    await fs.promises.writeFile(filePath, content);
    console.log(`Updated ${filePath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
