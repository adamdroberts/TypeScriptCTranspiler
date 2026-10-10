export function shift(left: number, right: number): number {
    return left << right;
}
export function complement(value: number): number {
    return ~value;
}
export function assign(left: number, right: number): number {
    left >>>= right;
    return left;
}
export function arithmetic(left: any, right: any): any {
    return (left - right) * 2 + ' units';
}
