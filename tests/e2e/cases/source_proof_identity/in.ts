import { format } from 'node:util';
const sourceProofKey = Symbol('source');
function sourceProofValue(input: { [key: symbol]: string } = {}): string {
    const { [sourceProofKey]: source = 'fallback' } = input;
    return format('%s', source);
}
console.log('value:', sourceProofValue({ [sourceProofKey]: 'selected' }));
console.log('fallback:', sourceProofValue());
