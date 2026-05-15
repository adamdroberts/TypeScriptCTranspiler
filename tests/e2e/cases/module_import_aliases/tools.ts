export const base = 4;

export function add(left: number, right: number): number {
    return left + right;
}

export default function format(label: string, value: number): string {
    return label + ":" + String(value);
}
