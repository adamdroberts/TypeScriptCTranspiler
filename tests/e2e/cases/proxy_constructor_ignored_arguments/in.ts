let marks = "";

function mark(label: string): string {
    marks += label;
    return label;
}

const proxy: any = new Proxy({ value: 3 }, {}, mark("a"));
console.log("proxy:", proxy.value);

const revocable: any = Proxy.revocable({ value: 4 }, {}, mark("b"), mark("c"));
console.log("revocable:", revocable.proxy.value);
revocable.revoke();

try {
    console.log("revoked:", revocable.proxy.value);
} catch (e) {
    console.log("revoked:", String(e));
}

console.log("marks:", marks);
