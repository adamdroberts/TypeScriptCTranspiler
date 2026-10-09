export interface Record { value: number; }
export class Shared {
    value: number = 7;
    method(): number { return this.value; }
    static method(): number { return 11; }
}
