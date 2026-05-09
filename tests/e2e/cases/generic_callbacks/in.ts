function identity<T>(x: T): T {
    return x;
}

function wrap<T>(x: T): T[] {
    return [x];
}

function keep<T>(x: T): boolean {
    return true;
}

function pick<T>(acc: T, x: T): T {
    return x;
}

function visit<T>(x: T): void {
    console.log("seen", x);
}

function keepOrder<T>(a: T, b: T): number {
    return 0;
}

const nums = [3, 1, 2];
const mappedNums = nums.map(identity);
const flatNums = nums.flatMap(wrap);
const keptNums = nums.filter(keep);
const lastNum = nums.reduce(pick, 0);
nums.forEach(visit);
nums.sort(keepOrder);

const words = ["a", "b"];
const mappedWords = words.map(identity);
const flatWords = words.flatMap(wrap);
const firstWord = words.find(keep);
const anyWord = words.some(keep);
const allWords = words.every(keep);

console.log("mapped nums:", mappedNums.join(","));
console.log("flat nums:", flatNums.join(","));
console.log("kept nums:", keptNums.join(","));
console.log("last num:", lastNum);
console.log("sorted nums:", nums.join(","));
console.log("mapped words:", mappedWords.join("|"));
console.log("flat words:", flatWords.join("|"));
console.log("first word:", firstWord);
console.log("word checks:", anyWord, allWords);
