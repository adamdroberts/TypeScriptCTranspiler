let calls = 0;

function bump(): number {
    calls++;
    return calls * 10;
}

console.log("string:", String(void bump()), calls);
console.log("number:", Number(void bump()), calls);
console.log("boolean:", Boolean(void bump()), calls);
void bump();
console.log("statement:", calls);
