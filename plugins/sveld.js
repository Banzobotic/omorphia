import {ComponentParser} from 'sveld'
import sveltePreprocess from 'svelte-preprocess'
import * as svelte from 'svelte/compiler'
import fs from 'fs/promises'
import path from 'path'

export default function sveld() {
    return {
        name: 'vite-plugin-sveld',
        async transform(src, id) {
            if (id.endsWith('?raw&sveld')) {
                const raw = JSON.parse(src.split('export default ')[1])

                const data = await parseRaw(raw, id)

                return {
                    code: `export default ${JSON.stringify(data)}`,
                    map: null
                }
            }
        },
        // This generates a `COMPONENT_API.json` with sveld in the `/_app` folder on build, which is used by the docs about components (only when built statically)
        async buildStart() {
            const output = {};

            const componentFiles = await fs.readdir(path.resolve('./src/lib/components'))

            for (const fileName of componentFiles) {
                const filePath = path.resolve('./src/lib/components', fileName)
                const raw = (await fs.readFile(filePath)).toString()
                output[fileName] = await parseRaw(raw, filePath)
            }

            try {
                await fs.mkdir(path.resolve('./src/generated'))
            } catch {
                // Do nothing, directory already exists
            }

            await fs.writeFile(path.resolve('./src/generated/COMPONENT_API.json'), JSON.stringify(output))
        },
    }
}

async function parseRaw(raw, filePath) {
    let { code } = await svelte.preprocess(raw, sveltePreprocess({ postcss: true }), {
        filename: filePath
    })
    return new ComponentParser({
        verbose: false
    }).parseSvelteComponent(code, {
        filePath,
        moduleName: filePath
    })
}