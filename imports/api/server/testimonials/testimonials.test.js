import natural from 'natural';
import { testData } from './testdata.js';
import { plainTestData } from './testplaindata.js'

natural.LogisticRegressionClassifier.load(Assets.absoluteFilePath('logistic_classifier_5.json'), null, function(err, classifier) {
	if(err){
		console.log(err);
	}
	let plainScore0 = 0;
	let plainScore2 = 0;
	let plainScore10 = 0;
	let plainScore50 = 0;
	let plainScore100 = 0
	let scoreFilter0 = 0
	let scoreFilter2 = 0;
	let scoreFilter10 = 0;
	let scoreFilter50 = 0;
	let scoreFilter100 = 0
	
	plainTestData.forEach(text=>{
		if(classifier.classify(text) == 'plain'){
			plainScore0++
			plainScore2++
			plainScore10++
			plainScore50++
			plainScore100++
		} else {
			const classifications = classifier.getClassifications(text);
			const testimonialScore = classifications[0].value;
			const plainScore = classifications[1].value;
			const factor = testimonialScore/plainScore;
			if(factor < 100){
				plainScore100++
			} 
			if(factor < 50){
				plainScore50++
			} 
			if(factor<10){
				plainScore10++
			}  
			if(factor<2){
				plainScore2++
			}
		}

	})

	testData.forEach(text=>{
		if(classifier.classify(text) == 'testimonial'){
			const classifications = classifier.getClassifications(text);
			const testimonialScore = classifications[0].value;
			const plainScore = classifications[1].value;
			const factor = testimonialScore/plainScore;
			if(factor > 100){
				scoreFilter100++
			} 
			if(factor > 50){
				scoreFilter50++
			} 
			if(factor>10){
				scoreFilter10++
			}  
			if(factor>2){
				scoreFilter2++
			}
			scoreFilter0++
		}

	})
	console.log(`Classifier 5 scored ${plainScore0}/${plainTestData.length} for the plain data test (no filter)`);
	console.log(`Classifier 5 scored ${plainScore2}/${plainTestData.length} for the plain data test (filter 2)`);
	console.log(`Classifier 5 scored ${plainScore10}/${plainTestData.length} for the plain data test (filter 10)`);
	console.log(`Classifier 5 scored ${plainScore50}/${plainTestData.length} for the plain data test (filter 50)`);
	console.log(`Classifier 5 scored ${plainScore100}/${plainTestData.length} for the plain data test (filter 100)`);
	console.log(`Classifier 5 scored ${scoreFilter0}/${testData.length} for the testimonial data test (no filter)`);
	console.log(`Classifier 5 scored ${scoreFilter2}/${testData.length} for the testimonial data test (filter 2)`);
	console.log(`Classifier 5 scored ${scoreFilter10}/${testData.length} for the testimonial data test (filter 10)`);
	console.log(`Classifier 5 scored ${scoreFilter50}/${testData.length} for the testimonial data test (filter 50)`);
	console.log(`Classifier 5 scored ${scoreFilter100}/${testData.length} for the testimonial data test (filter 100)`);

});