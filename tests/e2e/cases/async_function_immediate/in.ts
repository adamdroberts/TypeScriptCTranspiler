async function answer(): Promise<number> {
    return 42;
}

async function greet(name: string): Promise<string> {
    const label = "hi " + name;
    return label;
}

async function done(): Promise<void> {
    console.log("inside done");
}

const base = Promise.resolve("base");
async function adopt(): Promise<string> {
    return base;
}

answer().then((value: number): void => {
    console.log("answer:", value);
});

greet("Ada").then((value: string): void => {
    console.log("greet:", value);
});

done().then((_value: any): void => {
    console.log("done");
});

adopt().then((value: string): void => {
    console.log("adopt:", value);
});
