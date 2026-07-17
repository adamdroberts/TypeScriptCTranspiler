function report(label: string, target: any[], removed: any[]): void {
    console.log(
        label,
        target.join("|"),
        Object.keys(target).join("|"),
        removed.join("|"),
        Object.keys(removed).join("|"),
        Object.hasOwn(removed, "2"),
    );
}

const inheritedValues: any[] = ["deleted", "b", "deleted", "d"];
delete inheritedValues[0];
delete inheritedValues[2];
const inherited: any = inheritedValues;
Object.setPrototypeOf(inherited, { 0: "inherited" });
const inheritedRemoved: any[] = Array.prototype.splice.call(inherited, 0, 3, "x");
report("inherited:", inherited, inheritedRemoved);

const dynamicValues: any[] = ["deleted", "b", "deleted", "d"];
delete dynamicValues[0];
delete dynamicValues[2];
const dynamic: any = dynamicValues;
const dynamicRemoved: any[] = dynamic.splice(0, 3, "x");
report("dynamic holes:", dynamic, dynamicRemoved);

const typed: any[] = ["deleted", "b", "deleted", "d"];
delete typed[0];
delete typed[2];
const typedRemoved = typed.splice(0, 3, "x");
report("typed holes:", typed, typedRemoved);
