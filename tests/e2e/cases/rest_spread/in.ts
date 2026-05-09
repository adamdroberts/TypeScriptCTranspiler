function joinWords(prefix: string, ...words: string[]): string {
    console.log("count:", words.length);
    return prefix + words.join("-");
}

function sum(...nums: number[]): number {
    let total = 0;
    for (const n of nums) {
        total += n;
    }
    return total;
}

class Bag {
    addAll(label: string, ...items: string[]): string {
        return label + ":" + items.join(",");
    }
}

const base = ["a", "b"];
const more = [3, 4];

console.log(joinWords("x:", ...base, "c"));
console.log("sum:", sum(1, 2, ...more, 5));
console.log(new Bag().addAll("bag", ...base));
