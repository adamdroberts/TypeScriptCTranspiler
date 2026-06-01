const proto: any = Array.prototype;

const forward: any = [1, 2, 3];
let seenForward = "";
const forwardIndex: any = Reflect.apply(proto.findIndex, forward, [
    (value: any, index: any, self: any) => {
        seenForward += String(index) + ":" + String(value) + "|";
        if (index === 0) self.length = 1;
        return index === 2 && value === undefined;
    },
]);

const backward: any = [1, 2, 3];
let seenBackward = "";
const backwardIndex: any = Reflect.apply(proto.findLastIndex, backward, [
    (value: any, index: any, self: any) => {
        seenBackward += String(index) + ":" + String(value) + "|";
        if (index === 2) self.length = 1;
        return index === 1 && value === undefined;
    },
]);

console.log("forward:", forwardIndex, seenForward, forward.length);
console.log("backward:", backwardIndex, seenBackward, backward.length);
