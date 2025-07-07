import { runCommand, logChapter } from './lib/lib.js'

async function main() {

    logChapter('generate-open-api-docs')
    await runCommand('./generate-open-api-docs', 'npm install')
    await runCommand('./generate-open-api-docs', 'npm run build')


    logChapter('typescript-definitions')
    await runCommand('../typescript-definitions', 'npm install')
    await runCommand('../typescript-definitions', 'npm run build-all')

    logChapter('All done!\nBe sure to git commit any changes!')
}


main().catch(console.error)
