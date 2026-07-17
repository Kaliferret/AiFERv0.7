const listeners=new Map();
const peers=[{id:'peer-local',name:'Local node',latency:12,capabilities:['chat','files','ai']},{id:'peer-edge',name:'Edge node',latency:37,capabilities:['ai','cache']}];
const emit=(event,payload)=>{for(const fn of listeners.get(event)||[])fn(payload)};
export const ferMesh={getPeers(){return peers},on(event,handler){const set=listeners.get(event)||new Set();set.add(handler);listeners.set(event,set);return()=>set.delete(handler)},off(event,handler){listeners.get(event)?.delete(handler)},async send(event,payload){emit(event,payload);return{ok:true,delivered:peers.length}},async broadcast(event,payload){emit(event,payload);return{ok:true,delivered:peers.length}},async shareFile(name,dataUrl,type='file'){const file={id:Date.now().toString(36),name,dataUrl,type,sharedAt:Date.now()};emit('shared-file',file);return file},async sendMail(mail){emit('ferretMail',mail);return{ok:true}}};
export default ferMesh;
