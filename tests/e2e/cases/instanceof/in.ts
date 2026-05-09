class Animal {
    name: string;
    constructor(name: string) {
        this.name = name;
    }
}

class Dog extends Animal {
    constructor(name: string) {
        super(name);
    }
}

class Cat extends Animal {
    constructor(name: string) {
        super(name);
    }
}

const dog = new Dog("Rex");
const animal: Animal = dog;
const cat = new Cat("Mog");

console.log("dog Dog:", dog instanceof Dog);
console.log("dog Animal:", dog instanceof Animal);
console.log("animal Dog:", animal instanceof Dog);
console.log("cat Dog:", cat instanceof Dog);
console.log("cat Animal:", cat instanceof Animal);
