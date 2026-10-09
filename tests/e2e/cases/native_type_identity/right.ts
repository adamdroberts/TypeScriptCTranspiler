export interface Record { value: string; }
export class Shared {
    value: string = "right";
    method(): string { return this.value; }
    static method(): string { return "static"; }
}
