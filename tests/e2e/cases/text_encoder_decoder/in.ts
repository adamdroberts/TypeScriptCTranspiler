const encoder = new TextEncoder();
const decoder = new TextDecoder();

const str1 = "Hello, World!";
const encoded1 = encoder.encode(str1);
console.log(`Length: ${encoded1.length}`);
console.log(`Byte 0: ${encoded1[0]}`);
console.log(`Byte 1: ${encoded1[1]}`);

const decoded1 = decoder.decode(encoded1);
console.log(`Decoded: ${decoded1}`);

const str2 = "😊 UTF-8 Unicode 🚀";
const encoded2 = encoder.encode(str2);
const decoded2 = decoder.decode(encoded2);
console.log(`Decoded Unicode: ${decoded2}`);

// test with "utf-8" parameter
const decoderUtf8 = new TextDecoder("utf-8");
console.log(`Decoded UTF-8 with label: ${decoderUtf8.decode(encoded2)}`);

// test with no/optional arguments
const encodedEmpty = encoder.encode();
console.log(`Encoded empty len: ${encodedEmpty.length}`);
const decodedEmpty = decoder.decode();
console.log(`Decoded empty: "${decodedEmpty}"`);

function badDecoder(): string {
    try {
        return new TextDecoder("utf-16le").decode(encoded1);
    } catch (err) {
        return String(err);
    }
}
console.log(`Bad decoder: ${badDecoder()}`);
