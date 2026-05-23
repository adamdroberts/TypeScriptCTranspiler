function markMember(value: any, context: ClassMethodDecoratorContext): void {
    context.metadata.member = String(context.kind) + ":" + String(context.name);
}

function markClass(value: any, context: ClassDecoratorContext): void {
    console.log("member:", String(context.metadata.member));
    context.metadata.classed = "yes";
    console.log("classed:", String(context.metadata.classed));
}

@markClass
class Box {
    @markMember
    method(): void {}
}
