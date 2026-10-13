import { format } from 'node:util';
const sourceProofKey = Symbol('source');
function sourceProofRequest(input: { [key: symbol]: string } = {}): string {
    const { [sourceProofKey]: source = './fallback' } = input;
    return format('%s', source);
}
console.log('request:', require(sourceProofRequest({ [sourceProofKey]: './source' })).label);
console.log('fallback-source:', sourceProofRequest());
