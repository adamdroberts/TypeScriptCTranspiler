let seen = "";

function mark(label: string): number {
    seen += label;
    return 12345;
}

console.log("none:", Number.isNaN(Date.UTC()));
console.log("year only:", Date.UTC(2020));
console.log("epoch:", Date.UTC(1970, 0));
console.log("full:", Date.UTC(1970, 0, 2, 3, 4, 5, 6));
console.log("extra:", Date.UTC(1970, 0, 2, 3, 4, 5, 6, mark("u")));
console.log("short year:", Date.UTC(99, 0, 1));
console.log("overflow:", Date.UTC(2020, 13, 1));
console.log("seen:", seen);
