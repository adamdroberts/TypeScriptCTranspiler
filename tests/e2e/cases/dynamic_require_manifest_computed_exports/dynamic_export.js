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
    value: 7,
    enumerable: true,
});
Object.defineProperties(exports, {
    [descriptorsKey()]: {
        value: true,
        enumerable: true,
    },
});
