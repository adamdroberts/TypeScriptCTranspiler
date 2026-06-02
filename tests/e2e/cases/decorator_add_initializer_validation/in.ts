let seen = "";

function invalidClass(value: any, context: any): void {
    try {
        context.addInitializer();
    } catch (e: any) {
        seen = seen + "class missing:" + e + "|";
    }
}

function invalidMethod(value: any, context: any): void {
    try {
        context.addInitializer(1 as any);
    } catch (e: any) {
        seen = seen + "method noncallable:" + e + "|";
    }
}

@invalidClass
class Box {
    @invalidMethod
    method(): void {}
}

console.log("seen:", seen);
