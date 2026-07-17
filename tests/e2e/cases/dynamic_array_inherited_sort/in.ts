function report(label: string, value: any[]): void {
    console.log(
        label,
        value.join("|"),
        Object.keys(value).join("|"),
        Object.hasOwn(value, "2"),
    );
}

const inheritedValues: any[] = ["deleted", "c", "deleted"];
delete inheritedValues[0];
delete inheritedValues[2];
const inherited: any = inheritedValues;
Object.setPrototypeOf(inherited, { 0: "b" });
Array.prototype.sort.call(inherited);
report("inherited:", inherited);

const dynamicValues: any[] = ["deleted", "c", "deleted"];
delete dynamicValues[0];
delete dynamicValues[2];
const dynamic: any = dynamicValues;
dynamic.sort();
report("dynamic holes:", dynamic);

const typed: any[] = [3, "deleted", 1, "deleted"];
delete typed[1];
delete typed[3];
typed.sort((a: any, b: any) => Number(a) - Number(b));
report("typed holes:", typed);
