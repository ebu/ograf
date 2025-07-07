// const cp = require('child_process')
import cp from 'child_process'

export async function runCommand(cwd, cmd) {
    console.log('----------------------')
    if (cwd) {
        console.log(`cd ${cwd} && ${cmd}`)
    } else {
        console.log(`${cmd}`)
    }

    return new Promise((resolve, reject) => {
        const process = cp.spawn(cmd, { shell: true, cwd: cwd || __dirname })
        process.stdout.on('data', (data) => {
            console.log(`${data}`)
        })
        process.stderr.on('data', (data) => {
            console.error(`${data}`)
        })
        process.on('error', (error) => {
            console.error(`Error: ${error}`)
        })
        process.on('close', (code) => {
            if (code !== 0) {
                reject(`Command failed with code ${code}`)
            } else {
                resolve()
            }
        })
    })


}

export function logChapter(str) {
    console.log('======================================================================')
    for (const line of str.split('\n')) {
        console.log('=================== ' + line + (' =================================================='.slice(0,50-line.length)))
    }
    console.log('======================================================================')
}
