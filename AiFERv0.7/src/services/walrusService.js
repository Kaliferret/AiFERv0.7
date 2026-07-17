export const walrus={async put(data){return{cid:`walrus-${Date.now().toString(36)}`,size:JSON.stringify(data).length}},async get(cid){return{cid,found:true,data:null}}};
export default walrus;
