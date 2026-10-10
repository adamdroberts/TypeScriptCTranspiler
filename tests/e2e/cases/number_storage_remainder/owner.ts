export function remainder(left: number, right: number): number {
    return left % right;
}
export function assign(left: number, right: number): number {
    left %= right;
    return left;
}
