// Word-frequency CLI — reads a file, tokenizes with regex, counts in a Map,
// sorts by frequency, prints the top N.
// Usage: wordcount <file> [top=10]
// Demonstrates: fs.readFileSync, regex .split, Map, Array.sort with comparator,
//               process.argv, process.env, optional args with defaults.

// In a compiled binary, argv[0] is the program path; user args start at argv[1].
const args = process.argv;
if (args.length < 2) {
    console.error("usage: wordcount <file> [top=10]");
    process.exit(1);
}

const topN = args.length >= 3 ? parseInt(args[2], 10) : 10;
const content = fs.readFileSync(args[1]);
const words = content
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 0);

const counts = new Map<string, number>();
for (const w of words) {
    counts.set(w, (counts.get(w) ?? 0) + 1);
}

interface Entry {
    word: string;
    count: number;
}

const entries: Entry[] = counts.keys().map((k): Entry => ({
    word: k,
    count: counts.get(k) ?? 0,
}));

const sorted = entries.slice(0, entries.length).sort((a, b) => b.count - a.count);

console.log(`file:     ${args[1]}`);
console.log(`tokens:   ${words.length}`);
console.log(`distinct: ${sorted.length}`);
console.log(`top ${topN}:`);

const limit = sorted.length < topN ? sorted.length : topN;
for (let i = 0; i < limit; i++) {
    const e = sorted[i];
    console.log(`  ${e.word.padEnd(20)} ${e.count}`);
}
