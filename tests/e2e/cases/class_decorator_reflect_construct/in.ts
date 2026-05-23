let seen = "";

function replace(value: any, context: ClassDecoratorContext): any {
    seen = seen + String(context.kind) + ":" + String(context.name) + "|";
    return function(left: number, right: number): any {
        seen = seen + "replacement:" + left + ":" + right + "|";
        return Reflect.construct(value, [left + 1, right + 1]);
    };
}

@replace
class Box {
    left: number;
    right: number;

    constructor(left: number, right: number) {
        seen = seen + "original:" + left + ":" + right + "|";
        this.left = left;
        this.right = right;
    }
}

console.log("seen:", seen);
const literal: Box = Reflect.construct(Box, [1, 2]);
const typedArgs = [3, 4];
const typed: Box = Reflect.construct(Box, typedArgs);
const dynamicArgs: any = [5, 6];
const dynamic: Box = Reflect.construct(Box, dynamicArgs);
const tail = [8];
const spread: Box = Reflect.construct(Box, [7, ...tail]);

console.log("literal:", literal.left, literal.right);
console.log("typed:", typed.left, typed.right);
console.log("dynamic:", dynamic.left, dynamic.right);
console.log("spread:", spread.left, spread.right);
console.log("seen2:", seen);
