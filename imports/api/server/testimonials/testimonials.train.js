import natural from 'natural';
// import { testimonialData, plainData } from './trainingdata.js';
// import { testimonialDataIncrement } from './incrementTestimonialTrain.js';
// import { plainDataIncrement } from './incrementPlainTraining.js';

let logistic = new natural.LogisticRegressionClassifier();

testimonialData.forEach(testimonial=>{
	logistic.addDocument(testimonial, 'testimonial');
})

plainData.forEach(plain=>{
	logistic.addDocument(plain, 'plain');
})

testimonialDataIncrement.forEach(testimonial=>{
	logistic.addDocument(testimonial, 'testimonial');
})

plainDataIncrement.forEach(plain=>{
	logistic.addDocument(plain, 'plain');
})

logistic.train();

logistic.save('logistic_classifier.json', function(err, classifier) {
    console.log('Classifier has been trained and saved!');
});
