import { Dirent } from "node:fs";
import * as fs from "fs";

export const originalDirent = Dirent;
export const isFile = Dirent.prototype.isFile;
export async function retainedEntry(root: string): Promise<FSDirent> {
    const entries = await fs.promises.readdir(root, { withFileTypes: true });
    const entry = entries[0];
    await Promise.resolve();
    return entry;
}
