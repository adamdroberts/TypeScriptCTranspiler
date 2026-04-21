// Nullish coalescing
const maybeName: string | null = null;
const name = maybeName ?? "default";
console.log("name:", name);

const haveName: string | null = "Alice";
const name2 = haveName ?? "default";
console.log("name2:", name2);

// Optional chaining on class
interface User {
    name: string;
    age: number;
}

function find(id: number): User | null {
    if (id === 1) return { name: "Alice", age: 30 };
    return null;
}

const u = find(2);
console.log("name:", u?.name ?? "not found");
console.log("age:", u?.age ?? -1);

const u2 = find(1);
console.log("name2:", u2?.name ?? "not found");
console.log("age2:", u2?.age ?? -1);
