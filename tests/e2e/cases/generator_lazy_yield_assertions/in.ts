function* typedAssertions(): Generator<any, any, any> {
    console.log("start");

    const asValue = (yield "as") as string;
    console.log("as:", asValue.toUpperCase());

    const typeAssertValue = <any>(yield "type");
    console.log("type:", typeAssertValue + 2);

    const satisfiesValue = ((yield "satisfies") satisfies any);
    console.log("satisfies:", satisfiesValue.label);

    const nonNullValue = (yield "nonnull")!;
    console.log("nonnull:", nonNullValue);

    return "done";
}

const g: any = typedAssertions();
console.log("created");
console.log("next1:", JSON.stringify(g.next()));
console.log("next2:", JSON.stringify(g.next("ok")));
console.log("next3:", JSON.stringify(g.next(40)));
console.log("next4:", JSON.stringify(g.next({ label: "box" })));
console.log("next5:", JSON.stringify(g.next("value")));
