import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
    projectRoot,
    requireTrackedRegularProjectFile,
    trackedProjectFiles,
} from "../test262/model";

export const propertyRoot = path.resolve(import.meta.dir);

export async function propertyEvidenceFiles(
    suppliedTrackedFiles?: ReadonlySet<string>,
): Promise<string[]> {
    const trackedFiles = suppliedTrackedFiles ?? await trackedProjectFiles();
    const result: string[] = [];
    const worklist = [propertyRoot];
    while (worklist.length > 0) {
        const current = worklist.pop()!;
        const entries = await fs.readdir(current, { withFileTypes: true });
        entries.sort((left, right) => left.name.localeCompare(right.name));
        for (const entry of entries) {
            const filename = path.join(current, entry.name);
            if (entry.isSymbolicLink()) {
                throw new Error(`property evidence tree contains a symlink: ${path.relative(propertyRoot, filename)}`);
            }
            if (entry.isDirectory()) {
                worklist.push(filename);
                continue;
            }
            if (!entry.isFile()) {
                throw new Error(`property evidence tree contains a non-regular input: ${path.relative(propertyRoot, filename)}`);
            }
            const relative = path.relative(projectRoot, filename).split(path.sep).join("/");
            await requireTrackedRegularProjectFile(relative, trackedFiles, "property evidence input");
            if (entry.name.endsWith(".property.test.ts")) result.push(filename);
        }
    }
    return result.sort((left, right) => left.localeCompare(right));
}
