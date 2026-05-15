console.log("btoa:", btoa("Hi"), btoa("Hello"));
console.log("atob:", atob("SGk="), atob("SGVsbG8="));
console.log("round:", atob(btoa("abc123")));
