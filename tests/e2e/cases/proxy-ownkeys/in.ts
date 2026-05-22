const target: any = {
    a: 1,
    b: 2
};

function myOwnKeys(target: any): string[] {
    return ["c", "d"];
}

const handler: any = {
    ownKeys: myOwnKeys as any
};

const proxy: any = new Proxy(target, handler);

const keys = Object.keys(proxy);
for (let i = 0; i < keys.length; i++) {
    console.log(keys[i]);
}
