function exportKey() {
    return "label";
}

function descriptorKey() {
    return "count";
}

function descriptorsKey() {
    return "mode";
}

exports[exportKey()] = "manifest-backed";
Object.defineProperty(exports, descriptorKey(), {
    value: "seven",
    enumerable: true,
});
Object.defineProperties(exports, {
    [descriptorsKey()]: {
        value: "many",
        enumerable: true,
    },
});
