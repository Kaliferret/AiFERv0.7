const memory = new Map();
const parse=(v,f=null)=>{try{return JSON.parse(v)}catch{return f}};
export const indexedDBService={async get(key){if(typeof localStorage==='undefined')return memory.get(key)??null;const raw=localStorage.getItem(`aifer:${key}`);return raw==null?null:parse(raw,null)},async set(key,value){memory.set(key,value);if(typeof localStorage!=='undefined')localStorage.setItem(`aifer:${key}`,JSON.stringify(value));return true},async delete(key){memory.delete(key);if(typeof localStorage!=='undefined')localStorage.removeItem(`aifer:${key}`);return true}};
export default indexedDBService;
