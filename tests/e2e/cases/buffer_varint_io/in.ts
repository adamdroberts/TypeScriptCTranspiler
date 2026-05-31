const buf = Buffer.alloc(10);

// 1. Test writeUIntLE and readUIntLE
buf.writeUIntLE(0x123456789abc, 0, 6);
console.log("writeUIntLE(6):", buf.readUIntLE(0, 6).toString(16));

buf.writeUIntLE(0x123456, 0, 3);
console.log("writeUIntLE(3):", buf.readUIntLE(0, 3).toString(16));

// 2. Test writeUIntBE and readUIntBE
buf.writeUIntBE(0x123456789abc, 0, 6);
console.log("writeUIntBE(6):", buf.readUIntBE(0, 6).toString(16));

buf.writeUIntBE(0x123456, 0, 3);
console.log("writeUIntBE(3):", buf.readUIntBE(0, 3).toString(16));

// 3. Test writeIntLE and readIntLE (negative numbers)
buf.writeIntLE(-0x123456789abc, 0, 6);
console.log("writeIntLE(6):", buf.readIntLE(0, 6).toString(16));

buf.writeIntLE(-128, 0, 1);
console.log("writeIntLE(1):", buf.readIntLE(0, 1));

// 4. Test writeIntBE and readIntBE (negative numbers)
buf.writeIntBE(-0x123456789abc, 0, 6);
console.log("writeIntBE(6):", buf.readIntBE(0, 6).toString(16));

buf.writeIntBE(-128, 0, 1);
console.log("writeIntBE(1):", buf.readIntBE(0, 1));

// 5. Test errors and invalid bounds
try {
    buf.readUIntLE(0, 7);
} catch (e: any) {
    console.log("readUIntLE(7) error caught");
}

try {
    buf.readUIntLE(5, 6);
} catch (e: any) {
    console.log("readUIntLE(5, 6) offset error caught");
}

try {
    buf.writeUIntLE(0x12, 0, 0);
} catch (e: any) {
    console.log("writeUIntLE(0) error caught");
}
