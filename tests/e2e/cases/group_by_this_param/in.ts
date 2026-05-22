function objectKey(this: any, value: number, index: number): string {
    return String(this) + ":" + (index % 2);
}

const objectGroups = Object.groupBy([2, 4, 6], objectKey) as any;
console.log("object direct:", JSON.stringify(objectGroups["undefined:0"]), JSON.stringify(objectGroups["undefined:1"]));

const objectInline = Object.groupBy([1, 2], function (this: any, value, index) {
    return String(this) + ":" + value;
}) as any;
console.log("object inline:", JSON.stringify(objectInline["undefined:1"]), JSON.stringify(objectInline["undefined:2"]));

function mapKey(this: any, value: string, index: number): string {
    return String(this) + ":" + value.charAt(0);
}

const mapGroups = Map.groupBy(["aa", "ab", "ba"], mapKey);
console.log("map direct:", mapGroups.get("undefined:a")!.join(","), mapGroups.get("undefined:b")!.join(","));

const mapInline = Map.groupBy(["x", "yy"], function (this: any, value, index) {
    return String(this) + ":" + index;
});
console.log("map inline:", mapInline.get("undefined:0")!.join(","), mapInline.get("undefined:1")!.join(","));
