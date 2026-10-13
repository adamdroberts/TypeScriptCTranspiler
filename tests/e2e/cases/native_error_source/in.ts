const value = { name: "", message: "17;" };
console.log("borrowed:" + eval(Error.prototype.toString.call(value)));
let body = "19;";
try {
    const empty: any = null;
    empty.value;
} catch (error: any) {
    console.log("kind:" + error.name);
    console.log("text:" + typeof String(error));
}
console.log("source:" + eval(body));
