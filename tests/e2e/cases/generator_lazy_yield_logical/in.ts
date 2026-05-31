const events: string[] = [];

function mark(label: string, value: any): any {
    events.push(`${label}:${value}`);
    return value;
}

function* andReturn(): Generator<string, boolean, boolean> {
    return (yield mark("and-yield", "pause")) && mark("and-rhs", true);
}

function* orInit(): Generator<string, boolean, boolean> {
    const value = (yield mark("or-yield", "pause")) || mark("or-rhs", true);
    return mark("or-return", value);
}

function* nullishAssign(): Generator<string, string | null, string | null> {
    let value: string | null = null;
    value = (yield mark("nullish-yield", "pause")) ?? mark("nullish-rhs", "fallback");
    return mark("nullish-return", value);
}

function* dynamicLogical(): Generator<any, any, any> {
    const value = (yield mark("dynamic-yield", "")) || mark("dynamic-rhs", "fallback");
    return mark("dynamic-return", value);
}

function run(name: string, iter: Generator<any, any, any>, nextValue: any) {
    events.push(`-- ${name} --`);
    const first = iter.next();
    events.push(`first:${first.done}`);
    const second = iter.next(nextValue);
    events.push(`second:${second.done}:${second.value}`);
}

run("and", andReturn(), true);
run("or", orInit(), false);
run("nullish", nullishAssign(), null);
run("dynamic", dynamicLogical(), "");

console.log(events.join("\n"));
