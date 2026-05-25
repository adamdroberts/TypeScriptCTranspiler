let marks = "";

function mark(label: string): string {
    marks += label;
    return label;
}

const promise = new Promise<string>((resolve) => {
    marks += "x";
    resolve("ok");
}, mark("a"), mark("b"));

promise.then((value) => {
    console.log("then:", value, marks);
});
