function suffix(n: number): string {
    return String(n);
}

function key(prefix: string, n: number): string {
    return prefix + ":" + suffix(n);
}

const obj: any = {};
for (let i = 0; i < 80; i++) {
    obj[key("item", i)] = i * 3;
}

let objectTotal = 0;
for (let i = 0; i < 80; i++) {
    objectTotal += Number(obj[key("item", i)]);
}
console.log(objectTotal);

const map = new Map<string, number>();
for (let i = 0; i < 80; i++) {
    map.set(key("map", i), i + 1);
}

let mapTotal = 0;
for (let i = 0; i < 80; i++) {
    mapTotal += map.get(key("map", i))!;
}
console.log(mapTotal);

const jsonKey = JSON.stringify("quote\nkey");
obj[jsonKey] = "json";
console.log(obj[JSON.stringify("quote\nkey")]);
