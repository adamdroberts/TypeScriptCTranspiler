interface Fish {
    kind: "fish";
    swim: number;
}

interface Bird {
    kind: "bird";
    fly: number;
}

interface Lizard {
    kind: "lizard";
    crawl: number;
}

type Pet = Fish | Bird | Lizard;

function isFish(pet: Pet): pet is Fish {
    return pet.kind === "fish";
}

function isBird(pet: Pet): pet is Bird {
    return pet.kind === "bird";
}

function move(pet: Pet): string {
    if (!isFish(pet)) {
        if (isBird(pet)) {
            const speed: number = pet.fly;
            return "fly:" + speed;
        }
        const speed: number = pet.crawl;
        return "crawl:" + speed;
    }
    const speed: number = pet.swim;
    return "swim:" + speed;
}

console.log(move({ kind: "fish", swim: 7 }));
console.log(move({ kind: "bird", fly: 11 }));
console.log(move({ kind: "lizard", crawl: 13 }));
