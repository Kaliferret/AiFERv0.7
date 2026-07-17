export const federatedLearning={async train(batch=[]){return{rounds:1,examples:batch.length,loss:0.08}},getStatus(){return{peers:2,status:'idle'}}};
export default federatedLearning;
