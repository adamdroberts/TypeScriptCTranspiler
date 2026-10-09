const proto: any = Array.prototype;
const item: any = {
    toLocaleString: function (...args: any[]): string {
        return "arguments:" + args.length;
    },
};
const like: any = { 0: item, length: 1 };

console.log("locale:", Reflect.apply(proto.toLocaleString, like, ["fr", { style: "short" }, "ignored"]));
