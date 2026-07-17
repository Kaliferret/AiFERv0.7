export const lstmPredictor={async predict(sequence=[]){return{nextValue:sequence.length?sequence[sequence.length-1]:0,confidence:0.61}}};
export default lstmPredictor;
