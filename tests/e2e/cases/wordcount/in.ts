// Real-world-ish demo: count the words in /etc/hostname, pretty-print top N.
// Exercises: fs, string methods, regex, Map, Array.sort, arrow functions,
// module-level captures, for-of.

const TOP_N = 5;

function tokenize(text: string): string[] {
    // Split on non-word characters, lowercase everything, drop empties.
    return text.toLowerCase().split(/[^a-z0-9]+/).filter((s) => s.length > 0);
}

function countWords(words: string[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const w of words) {
        const existing = counts.get(w);
        counts.set(w, (existing ?? 0) + 1);
    }
    return counts;
}

const sample = "The quick brown fox jumps over the lazy dog. The dog sleeps.";
const words = tokenize(sample);
console.log("tokens:", words.length);

const counts = countWords(words);
console.log("distinct:", counts.size);

const entries: string[] = counts.keys().map((k) => k + "=" + counts.get(k));
const sorted = entries.slice(0, entries.length).sort((a, b) => a < b ? -1 : 1);
sorted.forEach((e) => console.log("  " + e));

console.log("the:", counts.get("the"));
console.log("dog:", counts.get("dog"));
console.log("unicorn:", counts.has("unicorn"));

// Bonus: environment-driven output.
const greeting = process.env.GREETING ?? "hello";
console.log("greet:", greeting);
