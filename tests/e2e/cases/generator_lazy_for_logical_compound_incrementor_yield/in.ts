function* andIncrementor(): Generator<any, string, any> {
    let i = 0;
    let gate: any = true;
    for (; i < 2; gate &&= yield "and") {
        yield "and-body-" + i;
        i++;
    }
    return "and-done";
}

function* orIncrementor(): Generator<any, string, any> {
    let i = 0;
    let gate: any = false;
    for (; i < 2; gate ||= yield "or") {
        yield "or-body-" + i;
        i++;
    }
    return "or-done";
}

function* nullishIncrementor(): Generator<any, string, any> {
    let i = 0;
    let gate: any = null;
    for (; i < 2; gate ??= yield "nullish") {
        yield "nullish-body-" + i;
        i++;
    }
    return "nullish-done";
}

const andIter = andIncrementor();
console.log("and-1", andIter.next().value);
console.log("and-2", andIter.next(false).value);
console.log("and-3", andIter.next().value);
console.log("and-4", andIter.next().value);

const orIter = orIncrementor();
console.log("or-1", orIter.next().value);
console.log("or-2", orIter.next(true).value);
console.log("or-3", orIter.next(true).value);
console.log("or-4", orIter.next().value);

const nullishIter = nullishIncrementor();
console.log("nullish-1", nullishIter.next().value);
console.log("nullish-2", nullishIter.next("value").value);
console.log("nullish-3", nullishIter.next("value").value);
console.log("nullish-4", nullishIter.next().value);
