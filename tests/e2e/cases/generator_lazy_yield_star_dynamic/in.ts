function* dynamicYieldStar(): Generator<any, string, undefined> {
    console.log("start");

    const values: any = [1, "two", true];
    yield* values;
    console.log("after array");

    const text: any = "az";
    yield* text;
    console.log("after string");

    return "done";
}

const g = dynamicYieldStar();
console.log("created");

let step: any = g.next();
while (!step.done) {
    console.log("yield:", String(step.value), typeof step.value);
    step = g.next();
}
console.log("return:", step.value);
