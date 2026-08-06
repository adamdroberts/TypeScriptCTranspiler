function* labeledControl(): Generator<number, string, number> {
    let events = "";
    let count = 0;
    outerWhile: while (count < 2) {
        count++;
        for (let index = 0; index < 2; index++) {
            events += `w${count}${index}`;
            continue outerWhile;
        }
    }

    let doCount = 0;
    outerDo: do {
        doCount++;
        if (doCount < 2) continue outerDo;
    } while (doCount < 2);
    events += "d";

    outerFor: for (let index = 0; index < 2; index++) {
        if (index === 0) continue outerFor;
        events += `f${index}`;
    }

    outerOf: for (const value of [1, 2]) {
        events += `o${value}`;
        continue outerOf;
    }

    const source: any = { a: 1, b: 2 };
    outerIn: for (const key in source) {
        events += `i${key}`;
        continue outerIn;
    }

    done: {
        events += "b";
        break done;
    }

    yield events.length;
    return events;
}

const generator = labeledControl();
const first: any = generator.next(0);
console.log(first.done, first.value);
const second: any = generator.next(0);
console.log(second.done, second.value);
