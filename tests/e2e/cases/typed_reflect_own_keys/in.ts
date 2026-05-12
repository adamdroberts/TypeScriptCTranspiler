interface Pair {
    left: number;
    right: string;
}

const pair: Pair = { left: 1, right: "r" };
console.log("iface", Reflect.ownKeys(pair).join("|"));

class Item {
    id = 7;
    name = "seven";
    label(): string {
        return this.name;
    }
}

const item = new Item();
console.log("class", Reflect.ownKeys(item).join("|"));
