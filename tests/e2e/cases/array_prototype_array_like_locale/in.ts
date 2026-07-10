const proto: any = Array.prototype;
const item: any = {
    toLocaleString: function (locale: any, options: any, extra: any): string {
        return String(locale) + ":" + String(options.style) + ":" + String(extra);
    },
};
const like: any = { 0: item, length: 1 };

console.log("locale:", Reflect.apply(proto.toLocaleString, like, ["fr", { style: "short" }, "ignored"]));
