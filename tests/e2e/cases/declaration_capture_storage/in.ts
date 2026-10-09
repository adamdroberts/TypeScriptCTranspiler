function capturedString(input: any): () => string {
    const text = "prefix:" + input.label;
    return () => text;
}

function capturedValue(input: unknown): { read: () => unknown; write: (value: unknown) => void } {
    let value = input;
    return { read: () => value, write: (next: unknown) => { value = next; } };
}

const read = capturedString({ label: "label" });
console.log(read());
const retained = capturedValue("initial");
const marker = { label: "changed" };
retained.write(marker);
console.log(retained.read() === marker);
retained.write(undefined);
console.log(retained.read() === undefined);
