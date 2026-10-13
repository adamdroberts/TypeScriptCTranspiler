const raw = JSON.rawJSON("31");
console.log("property:", eval(raw.rawJSON));
console.log("serialized:", eval(JSON.stringify(raw)));
