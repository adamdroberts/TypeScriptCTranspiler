export default class Greeter {
    name: string;

    constructor(name: string) {
        this.name = name;
    }

    greet(): string {
        return "hello " + this.name;
    }
}
