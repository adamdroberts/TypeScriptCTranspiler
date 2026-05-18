console.log("nan strings:", isNaN("NaN"), isNaN("1"), isNaN("1x"));
console.log("finite strings:", isFinite("1"), isFinite("1x"));
console.log("bool:", isNaN(true), isFinite(false));

const dynamicNan: any = "NaN";
const dynamicOne: any = "1";
const dynamicBool: any = true;
console.log("dynamic:", isNaN(dynamicNan), isFinite(dynamicOne), isFinite(dynamicBool));

let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}
console.log("ignored:", isNaN("NaN", mark("n")), isFinite("2", mark("f")), seen);
