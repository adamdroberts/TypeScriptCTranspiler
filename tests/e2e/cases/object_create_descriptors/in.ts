const proto: any = { inherited: "base" };

function make(): any {
    let hidden = 2;
    const getHidden = () => hidden;
    const setHidden = (value: number) => {
        hidden = value;
    };
    return Object.create(proto, {
        own: {
            value: "value",
            writable: true,
            enumerable: true,
            configurable: true,
        },
        secret: {
            get: getHidden,
            set: setHidden,
            enumerable: true,
            configurable: true,
        },
        quiet: {
            value: "hidden",
            writable: true,
            enumerable: false,
            configurable: true,
        },
    });
}

const obj: any = make();
console.log("proto:", Object.getPrototypeOf(obj) === proto, obj.inherited);
console.log("keys:", Object.keys(obj).join("|"));
console.log("values:", Object.values(obj).join("|"));
console.log("has:", Object.hasOwn(obj, "own"), Object.hasOwn(obj, "inherited"));
const quietDesc: any = Object.getOwnPropertyDescriptor(obj, "quiet");
console.log("quiet:", quietDesc.enumerable, quietDesc.value);
obj.secret = 7;
console.log("secret:", obj.secret);
console.log("json:", JSON.stringify(obj));
