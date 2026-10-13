import {userInfo} from 'node:os';
try{userInfo({encoding:'utf16le' as any})}catch(error){console.log('unrepresented:',String(error))}
