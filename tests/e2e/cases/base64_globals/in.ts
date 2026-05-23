let seen = "";
function mark(label: string): string {
    seen += label;
    return label;
}

console.log("btoa:", btoa("Hi"), btoa("Hello"));
console.log("atob:", atob("SGk="), atob("SGVsbG8="));
console.log("round:", atob(btoa("abc123")));
console.log("ignored:", btoa("OK", mark("b")), atob("T0s=", mark("a")), seen);
