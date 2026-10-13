const error: any = new TypeError("before");
console.log("caught:", error);
error.name = "Renamed";
error.message = "after";
error.code = "E_SAMPLE";
console.log("changed:", error);
Object.defineProperty(error, "extra", { get() { throw "inspected getter"; }, enumerable: true });
console.log("descriptor:", error);
