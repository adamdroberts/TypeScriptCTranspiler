let body = "17;";
const options = {
    get with() {
        body = "23;";
        return { get type() { body = "29;"; return "json"; } };
    },
};
const pending = import("./data.json", options);
console.log("source:", eval(body));
pending.then((namespace: any) => console.log("module:", namespace.default));
