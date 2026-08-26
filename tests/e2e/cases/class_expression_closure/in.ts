function makeClass(seed: any): any {
    let captured: any = seed;
    return class NamedExpression {
        read(this: any, delta: any): any {
            return captured + this.offset + delta;
        }

        static label(this: any): any {
            return captured + ":" + this.name;
        }
    };
}

const Left: any = makeClass(10);
const Right: any = makeClass(20);
const Again: any = makeClass(10);
const left: any = new Left();
const right: any = new Right();
left.offset = 3;
right.offset = 4;

const descriptor: any = Object.getOwnPropertyDescriptor(Left.prototype, "read");
const constructorDescriptor: any = Object.getOwnPropertyDescriptor(Left.prototype, "constructor");
let callRejected = false;
try {
    Left();
} catch (error) {
    callRejected = error instanceof TypeError;
}

const valid =
    left.read(2) === 15 &&
    right.read(2) === 26 &&
    Left.label() === "10:NamedExpression" &&
    Right.label() === "20:NamedExpression" &&
    Left !== Right &&
    Left !== Again &&
    left instanceof Left &&
    !(left instanceof Right) &&
    Left.prototype.constructor === Left &&
    descriptor.value === Left.prototype.read &&
    descriptor.writable === true &&
    descriptor.enumerable === false &&
    descriptor.configurable === true &&
    constructorDescriptor.value === Left &&
    constructorDescriptor.writable === true &&
    constructorDescriptor.enumerable === false &&
    constructorDescriptor.configurable === true &&
    callRejected;

console.log("class expression closure:", valid);
