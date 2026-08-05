let calls = 0;

function combine(first: number, second: number): number {
    calls++;
    return first + second;
}

function* multiYieldCallDeclarationInitializer(): Generator<string, string, number> {
    for (
        let value = combine(yield "first", yield "second");
        value < 5;
        value++
    ) {
        yield "body-" + value;
    }
    return "done";
}

const iterator = multiYieldCallDeclarationInitializer();
const first: any = iterator.next();
console.log("first", calls, first.done, first.value);
const second: any = iterator.next(1);
console.log("second", calls, second.done, second.value);
const third: any = iterator.next(2);
console.log("third", calls, third.done, third.value);
const fourth: any = iterator.next();
console.log("fourth", calls, fourth.done, fourth.value);
const fifth: any = iterator.next();
console.log("fifth", calls, fifth.done, fifth.value);
