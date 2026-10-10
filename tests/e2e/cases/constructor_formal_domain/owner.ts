export class ConstructorOwner {
    value: any;
    reader: () => any;
    replace: (next: any) => void;
    constructor(value: number) {
        this.value = value;
        this.reader = () => value;
        this.replace = (next: any) => { value = next; };
    }
}
export class ParameterOwner {
    constructor(public readonly value: number) {}
}
