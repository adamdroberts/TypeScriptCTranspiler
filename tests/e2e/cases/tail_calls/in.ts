function countDown(n: number, acc: number): number {
    if (n <= 0) return acc;
    return countDown(n - 1, acc + 1);
}

function swapSteps(a: number, b: number, n: number): number {
    if (n <= 0) return a * 1000 + b;
    return swapSteps(b, a, n - 1);
}

function gcd(a: number, b: number): number {
    if (b === 0) return a;
    return gcd(b, a % b);
}

console.log("deep:", countDown(1000000, 0));
console.log("swap:", swapSteps(1, 2, 3));
console.log("gcd:", gcd(462, 1071));
