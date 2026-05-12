function makeScore(seed: number): any {
    let current = seed;
    const obj: any = {};
    const readScore = (): number => current + 1;
    const writeScore = (value: number): void => {
        current = value * 5;
    };

    Object.defineProperty(obj, "score", {
        get: readScore,
        set: writeScore,
        enumerable: true,
        configurable: true,
    });

    return obj;
}

const box: any = makeScore(3);
console.log("initial:", box.score);
console.log("set:", Reflect.set(box, "score", 4));
console.log("after:", box.score);
console.log("keys:", Object.keys(box).join("|"));

let hits = 0;
const inlineObj: any = {};
Reflect.defineProperty(inlineObj, "next", {
    get: (): number => {
        hits = hits + 1;
        return hits;
    },
    enumerable: true,
    configurable: true,
});

console.log("inline:", inlineObj.next, inlineObj.next, hits);
