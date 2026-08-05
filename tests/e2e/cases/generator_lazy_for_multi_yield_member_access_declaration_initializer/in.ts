let getterCalls = 0;

function* multiYieldMemberAccessDeclarationInitializer(): Generator<string, string, any> {
    for (
        let value: any = (yield "receiver").answer[yield "key"],
        count = 0;
        count < 1;
        count++
    ) {
        yield "body-" + value;
    }
    return "done";
}

const receiver: any = {
    get answer() {
        getterCalls++;
        return { value: "ok" };
    },
};

const iterator = multiYieldMemberAccessDeclarationInitializer();
const first: any = iterator.next();
console.log("first", getterCalls, first.done, first.value);
const second: any = iterator.next(receiver);
console.log("second", getterCalls, second.done, second.value);
const third: any = iterator.next("value");
console.log("third", getterCalls, third.done, third.value);
const done: any = iterator.next();
console.log("done", getterCalls, done.done, done.value);
