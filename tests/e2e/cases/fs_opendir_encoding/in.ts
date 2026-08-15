import fs from "node:fs";

const root = "/tmp/tsc2c-fs-opendir-encoding";

function readNames(dir: FSDir): string[] {
    const names: string[] = [];
    let entry = dir.readSync();
    while (entry !== null) {
        names.push(typeof entry.name === "string" ? entry.name : entry.name.toString());
        entry = dir.readSync();
    }
    return names.sort();
}

async function readAsyncNames(dir: FSDir): Promise<string[]> {
    const names: string[] = [];
    let entry = await dir.read();
    while (entry !== null) {
        names.push(typeof entry.name === "string" ? entry.name : entry.name.toString());
        entry = await dir.read();
    }
    return names.sort();
}

async function main(): Promise<void> {
    fs.rmSync(root, { recursive: true, force: true });
    fs.mkdirSync(root);
    fs.writeFileSync(root + "/alpha.txt", "alpha");
    fs.writeFileSync(root + "/beta.txt", "beta");

    const hexDir = fs.opendirSync(root, { encoding: "hex" });
    console.log("hex:", readNames(hexDir).join("|"));
    hexDir.closeSync();

    const base64Encoding: "base64" = "base64";
    const base64Dir = await fs.promises.opendir(root, { encoding: base64Encoding });
    console.log("base64:", (await readAsyncNames(base64Dir)).join("|"));
    await base64Dir.close();

    const bufferDir = fs.opendirSync(root, { encoding: "buffer" });
    let bufferCount = 0;
    let bufferEntry = bufferDir.readSync();
    while (bufferEntry !== null) {
        if (Buffer.isBuffer(bufferEntry.name)) bufferCount++;
        bufferEntry = bufferDir.readSync();
    }
    console.log("buffer:", bufferCount);
    bufferDir.closeSync();

    fs.rmSync(root, { recursive: true, force: true });
}

main().catch((reason: any): void => console.log("error:", reason));
