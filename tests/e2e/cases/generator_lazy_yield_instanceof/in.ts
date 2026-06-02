class Animal {
    name = "animal";
}

class Dog extends Animal {}

function* checks(): Generator<string, string, any> {
    const dog = (yield "dog?") instanceof Dog;
    const animal = (yield "animal?") instanceof Animal;
    const missing = (yield "missing?") instanceof Animal;
    return [dog, animal, missing].join(",");
}

const iter = checks();
const first: any = iter.next();
const second: any = iter.next(new Dog());
const third: any = iter.next(new Animal());
const done: any = iter.next(null);

console.log("steps:", first.value, second.value, third.value, done.done, done.value);
