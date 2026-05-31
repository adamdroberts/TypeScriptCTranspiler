interface Step {
    done: boolean;
    value: number;
}

// 1. Array [Symbol.iterator]()
const arr = [10, 20, 30];
const arrIter = arr[Symbol.iterator]();
console.log("arr next 1:", arrIter.next().value);
console.log("arr next 2:", arrIter.next().value);
console.log("arr next 3:", arrIter.next().value);
console.log("arr next 4 done:", arrIter.next().done);

// 2. String [Symbol.iterator]()
const str = "abc";
const strIter = str[Symbol.iterator]();
console.log("str next 1:", strIter.next().value);
console.log("str next 2:", strIter.next().value);
console.log("str next 3:", strIter.next().value);
console.log("str next 4 done:", strIter.next().done);

// 3. Set [Symbol.iterator]()
const set = new Set<string>();
set.add("x");
set.add("y");
const setIter = set[Symbol.iterator]();
console.log("set next 1:", setIter.next().value);
console.log("set next 2:", setIter.next().value);
console.log("set next 3 done:", setIter.next().done);

// 4. Map [Symbol.iterator]()
const map = new Map<string, number>();
map.set("a", 1);
map.set("b", 2);
const mapIter = map[Symbol.iterator]();
const entry1 = mapIter.next().value;
console.log("map next 1 key:", entry1[0], "val:", entry1[1]);
const entry2 = mapIter.next().value;
console.log("map next 2 key:", entry2[0], "val:", entry2[1]);
console.log("map next 3 done:", mapIter.next().done);

// 5. Generator [Symbol.iterator]()
function* range(start: number, end: number): IterableIterator<number> {
    for (let value = start; value <= end; value++) {
        yield value;
    }
}
const gen = range(1, 2);
const genIter = gen[Symbol.iterator]();
console.log("gen next 1:", genIter.next().value);
console.log("gen next 2:", genIter.next().value);
console.log("gen next 3 done:", genIter.next().done);

// 6. Custom Iterable [Symbol.iterator]()
class CustomIterator {
    current: number;
    end: number;
    constructor(start: number, end: number) {
        this.current = start;
        this.end = end;
    }
    next(): Step {
        if (this.current > this.end) {
            return { done: true, value: 0 };
        }
        const value = this.current;
        this.current++;
        return { done: false, value };
    }
}
class CustomIterable {
    start: number;
    end: number;
    constructor(start: number, end: number) {
        this.start = start;
        this.end = end;
    }
    [Symbol.iterator](): CustomIterator {
        return new CustomIterator(this.start, this.end);
    }
}
const customObj = new CustomIterable(5, 6);
const customIter = customObj[Symbol.iterator]();
console.log("custom next 1:", customIter.next().value);
console.log("custom next 2:", customIter.next().value);
console.log("custom next 3 done:", customIter.next().done);

// 7. Custom Iterator self-iterable [Symbol.iterator]()
class SelfIterator {
    current: number;
    end: number;
    constructor(start: number, end: number) {
        this.current = start;
        this.end = end;
    }
    [Symbol.iterator](): SelfIterator {
        return this;
    }
    next(): Step {
        if (this.current > this.end) {
            return { done: true, value: 0 };
        }
        const value = this.current;
        this.current++;
        return { done: false, value };
    }
}
const selfObj = new SelfIterator(8, 9);
const selfIter = selfObj[Symbol.iterator]();
console.log("self next 1:", selfIter.next().value);
console.log("self next 2:", selfIter.next().value);
console.log("self next 3 done:", selfIter.next().done);
