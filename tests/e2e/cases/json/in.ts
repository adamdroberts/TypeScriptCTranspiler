interface Person {
    name: string;
    age: number;
    active: boolean;
}

const alice: Person = { name: "Alice", age: 30, active: true };
console.log(JSON.stringify(alice));

const nums: number[] = [1, 2, 3.5, -4];
console.log(JSON.stringify(nums));

const people: Person[] = [
    { name: "Bob", age: 25, active: false },
    { name: "Carol", age: 40, active: true },
];
console.log(JSON.stringify(people));

const tricky = "she said \"hi\"\nok";
console.log(JSON.stringify(tricky));
