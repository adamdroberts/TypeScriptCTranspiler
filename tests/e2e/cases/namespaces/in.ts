namespace MathBox {
    export const label = "box";
    export let count = 0;

    export function add(a: number, b: number): number {
        count += 1;
        return a + b;
    }

    export const double = (n: number): number => n * 2;

    export namespace Nested {
        export const suffix = "nested";

        export function join(left: string): string {
            return left + ":" + suffix;
        }
    }
}

console.log(MathBox.label, MathBox.add(2, 3), MathBox.count);
console.log(MathBox.double(7));
MathBox.count = 10;
console.log(MathBox.add(1, 1), MathBox.count);
console.log(MathBox.Nested.join("ok"));
