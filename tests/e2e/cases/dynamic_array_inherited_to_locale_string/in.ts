function localeItem(label: string): any {
    return {
        label,
        toLocaleString: function (this: any, locale: any, options: any): string {
            return String(this.label) + ":" + String(locale) + ":" + String(options.style);
        },
    };
}

const dynamicValues: any[] = ["deleted", null, localeItem("own")];
delete dynamicValues[0];
const dynamic: any = dynamicValues;
const dynamicProto: any = Object.create(Array.prototype);
dynamicProto[0] = localeItem("inherited");
Object.setPrototypeOf(dynamic, dynamicProto);
console.log("dynamic:", dynamic.toLocaleString("fr", { style: "short" }));

const typed: any[] = ["deleted", null, localeItem("own")];
delete typed[0];
const typedProto: any = Object.create(Array.prototype);
typedProto[0] = localeItem("inherited");
Object.setPrototypeOf(typed, typedProto);
console.log("typed:", typed.toLocaleString("fr", { style: "short" }));
