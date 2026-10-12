export let value = 7;
export const marker = { identity: 11 };
export function mutate(): void { value++; }
async function run(): Promise<void> {
    const first = await import("./in.js");
    const second = await import("./in.js");
    console.log(first === second);
    console.log(first.marker === marker);
    first.mutate();
    console.log(first.value === 8 && value === 8);
}
run();
