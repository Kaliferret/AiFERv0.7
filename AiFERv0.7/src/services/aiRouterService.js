export const aiRouter={async ask(prompt,options={}){return{text:`AiFER v0.7 mock response: ${String(prompt).slice(0,240)}`,model:options.model||'local-sim',provider:'mock',tokens:String(prompt||'').split(/\s+/).filter(Boolean).length}}};
export default aiRouter;
