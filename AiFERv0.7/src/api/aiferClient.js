import { aiRouter } from '@/services/aiRouterService';
import { ferMesh } from '@/services/ferMeshService';
import { physicsEngine } from '@/services/physicsEngine';
import { federatedAI } from '@/services/federatedAIService';
import { aifStorage } from '@/services/aif-runtime/aifFilesystem';
import { aifKeyManager } from '@/services/aif-runtime/aifCrypto';
import { aifPackageManager } from '@/services/aif-runtime/aifPackageManager';

export const aiferClient={aiRouter:{async ask(prompt,options){const result=await aiRouter.ask(prompt,options);return result.text??result}},mesh:ferMesh,physics:physicsEngine,federatedAI,filesystem:aifStorage,crypto:aifKeyManager,packages:aifPackageManager,async getSystemInfo(){return{app:'AiFER',version:'0.7.0',runtime:typeof window==='undefined'?'server':'web'}}};
export default aiferClient;
