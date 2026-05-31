function* testUnary(): Generator<any, any, any> {
    console.log("start");

    // 1. !(yield x)
    const val1 = !(yield "first");
    console.log("not:", val1);

    // 2. +(yield x)
    const val2 = +(yield "second");
    console.log("pos:", val2);

    // 3. -(yield x)
    const val3 = -(yield "third");
    console.log("neg:", val3);

    // 4. ~(yield x)
    const val4 = ~(yield "fourth");
    console.log("tilde:", val4);

    // 5. typeof (yield x)
    const val5 = typeof (yield "fifth");
    console.log("typeof:", val5);

    // 6. void (yield x)
    const val6 = void (yield "sixth");
    console.log("void:", String(val6));

    return "done";
}

const g = testUnary();
console.log("created");
console.log("next1:", JSON.stringify(g.next()));
console.log("next2:", JSON.stringify(g.next(true)));
console.log("next3:", JSON.stringify(g.next("42")));
console.log("next4:", JSON.stringify(g.next(10)));
console.log("next5:", JSON.stringify(g.next(5.5)));
console.log("next6:", JSON.stringify(g.next("hello")));
console.log("next7:", JSON.stringify(g.next("ignored")));
