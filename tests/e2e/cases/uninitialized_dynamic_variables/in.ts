let topAny;
let topExplicitAny: any;

function readLocalUninitialized() {
    let localAny;
    let localExplicitAny: any;
    return [
        typeof localAny,
        localAny === undefined,
        typeof localExplicitAny,
        localExplicitAny === undefined,
    ];
}

function readCapturedUninitialized() {
    let captured: any;
    const reader = () => [typeof captured, captured === undefined];
    return reader();
}

const local = readLocalUninitialized();
const captured = readCapturedUninitialized();
console.log("top:", typeof topAny, topAny === undefined, typeof topExplicitAny, topExplicitAny === undefined);
console.log("local:", local[0], local[1], local[2], local[3]);
console.log("captured:", captured[0], captured[1]);
