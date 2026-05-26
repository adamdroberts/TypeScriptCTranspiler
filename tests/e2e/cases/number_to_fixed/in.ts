console.log("fixed0:", (12.34).toFixed());
console.log("fixed2:", (12.34).toFixed(2));
console.log("small:", (0.5).toFixed(3));
console.log("negative:", (-2.5).toFixed(1));

const dynamicNumber: any = 7.5;
let ignored = "";
function mark(label: string): string {
    ignored += label;
    return label;
}
console.log("fixed undefined:", (12.34).toFixed(undefined, mark("u")));
console.log("dynamic:", dynamicNumber.toFixed(1, mark("f")));
console.log("ignored:", ignored);
