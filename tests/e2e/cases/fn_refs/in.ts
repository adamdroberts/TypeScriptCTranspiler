// Lifted arrow bindings at module scope → static C functions.
const doubler = (x: number) => x * 2;
const addOne = (x: number): number => x + 1;
const isEven = (n: number): boolean => n % 2 === 0;

function describe(n: number): string {
    return "n=" + n;
}

const xs: number[] = [1, 2, 3, 4, 5];

// Pass function references to HOFs.
const doubled = xs.map(doubler);
console.log("doubled:", doubled.join(","));

const incremented = xs.map(addOne);
console.log("inc:", incremented.join(","));

const evens = xs.filter(isEven);
console.log("evens:", evens.join(","));

// Mix: inline arrow alongside named.
const labeled = xs.map(doubler).map((v) => "x=" + v);
console.log(labeled.join(" "));

// Function declaration as callback works too.
const described = xs.map(describe);
console.log(described.join(" | "));

// Direct call of lifted arrow.
console.log("doubler(7):", doubler(7));
console.log("addOne(99):", addOne(99));
