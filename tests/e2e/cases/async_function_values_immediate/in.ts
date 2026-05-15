const double = async (value: number): Promise<number> => value * 2;

const upper = async function (word: string): Promise<string> {
    return word.toUpperCase();
};

function makeJoiner(prefix: string): (name: string) => Promise<string> {
    return async (name: string): Promise<string> => {
        return prefix + name;
    };
}

double(5).then((value: number): void => {
    console.log("double:", value);
});

upper("ok").then((value: string): void => {
    console.log("upper:", value);
});

const joiner = makeJoiner("hi ");
joiner("Ada").then((value: string): void => {
    console.log("join:", value);
});
