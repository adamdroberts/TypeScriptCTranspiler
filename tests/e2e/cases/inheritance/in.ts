class Animal {
    name: string;
    constructor(name: string) {
        this.name = name;
    }
    describe(): string {
        return "I am " + this.name;
    }
}

class Dog extends Animal {
    breed: string;
    constructor(name: string, breed: string) {
        super(name);
        this.breed = breed;
    }
    bark(): string {
        return this.name + " says woof! (a " + this.breed + ")";
    }
}

const d = new Dog("Rex", "Lab");
console.log(d.describe());
console.log(d.bark());
console.log(d.name, d.breed);

class Counter {
    static current: number = 0;
    static increment(): number {
        Counter.current = Counter.current + 1;
        return Counter.current;
    }
    static reset(): void {
        Counter.current = 0;
    }
}

console.log("count:", Counter.increment());
console.log("count:", Counter.increment());
console.log("count:", Counter.increment());
Counter.reset();
console.log("after reset:", Counter.current);
