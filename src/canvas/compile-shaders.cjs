const fs = require("node:fs/promises");

(async () => {
    const shaderCommon = await fs.readFile("common.glsl");

    const files = await fs.readdir(__dirname);
    for (const file of files) {
        (async () => {
            const fileData = await fs.readFile(file);
            fs.writeFile(file, fileData.toString().replace(
                /\/\/COMMON_START[\w\W]*?\/\/COMMON_END/g, shaderCommon
            ));
        })();
    }
})();