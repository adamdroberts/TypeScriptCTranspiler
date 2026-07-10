function exportKey() {
    return "label";
}

function descriptorKey() {
    return "count";
}

exports[exportKey()] = "manifest-backed";
Object.defineProperty(exports, descriptorKey(), {
    value: "seven",
    enumerable: true,
});
