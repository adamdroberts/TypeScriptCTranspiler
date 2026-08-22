import * as fs from "node:fs/promises";
import * as path from "node:path";

export const propertyRoot = path.resolve(import.meta.dir);

export async function propertyEvidenceFiles(): Promise<string[]> {
    const result: string[] = [];
    const worklist = [propertyRoot];
    while (worklist.length > 0) {
        const current = worklist.pop()!;
        const entries = await fs.readdir(current, { withFileTypes: true });
        entries.sort((left, right) => left.name.localeCompare(right.name));
        for (const entry of entries) {
            const filename = path.join(current, entry.name);
            if (entry.isDirectory()) worklist.push(filename);
            else if (entry.isFile() && entry.name.endsWith(".property.test.ts")) result.push(filename);
        }
    }
    return result.sort((left, right) => left.localeCompare(right));
}
