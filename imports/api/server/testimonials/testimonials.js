/*Npm Modules */
import natural from 'natural';
import cheerio from 'cheerio';
import request from 'request';
import nodeurl from 'url';
import nlp from 'compromise';
//import { testimonialData, plainData } from './trainingdata.js';
// import { testimonialData } from './incrementTestimonialTrain.js';
// import { plainData } from './incrementPlainTraining.js';
import language from '@google-cloud/language';
//import CoreNLP, { Properties, Pipeline, ConnectorServer } from 'corenlp';
import pd from 'paralleldots';

//import logistic_classifier from '/imports/api/server/testimonials/trainedClassifiers/logistic_classifier.json';
// import logistic_classifier_2 from '/imports/api/server/testimonials/trainedClassifiers/logistic_classifier_2.json';
// import logistic_classifier_3 from '/imports/api/server/testimonials/trainedClassifiers/logistic_classifier_3.json';
//import logistic_classifier_5 from '/imports/api/server/testimonials/trainedClassifiers/logistic_classifier_5.json';


// import { testData } from './testdata.js';
// import { plainTestData } from './testplaindata.js'

/*Internal modules*/
import { CorrectTestimonialCollection , WrongTestimonialCollection , truePositives, falsePositives } from '../../both/collections/TestimonialCollection.js';

/* Instantiate paralleldots */
pd.apiKey = "l6SW7NUATYudvEHJE1dgWvg0AZACODHjGm65vH43Es8";

/* Instantiate coreNLP server */
// const props = new Properties({
//   annotators: 'ner',
// });

// const connector = new ConnectorServer({ dsn: 'https://fast-crag-55472.herokuapp.com/' });	// URL of internally set up stanford CoreNLP server

// const pipeline = new Pipeline(props, 'English', connector);

/* Instantiates Google Cloud Natural Language client */
const client = new language.LanguageServiceClient({
	projectId: Meteor.settings.PROJECT_ID,
	credentials: {
		private_key: Meteor.settings.private_key.replace(/\\n/g, '\n'),
		client_email: Meteor.settings.client_email
	}
});



// const oldClassifier = natural.LogisticRegressionClassifier.restore((logistic_classifier));
// const newClassifier = natural.LogisticRegressionClassifier.restore((new_logistic_classifier));
//let classifier = natural.LogisticRegressionClassifier.restore(logistic_classifier_5);


//let classifier = new natural.BayesClassifier();

 //let classifier = new natural.LogisticRegressionClassifier();

// const testimonialUserData = CorrectTestimonialCollection.find({}).fetch();

// const plainUserData = WrongTestimonialCollection.find({}).fetch();


// testimonialUserData.forEach((testimonial)=>{
// 	classifier.addDocument(testimonial.text,'testimonial');
// })

// testimonialData.forEach((testimonial)=>{
// 	classifier.addDocument(testimonial,'testimonial');
	
// });

// plainData.forEach((plain)=>{
// 	classifier.addDocument(plain,'plain');
	
// });

// plainUserData.forEach((plain)=>{
// 	classifier.addDocument(plain.text,'plain')
// })

//classifier.train();

// natural.LogisticRegressionClassifier.load(Assets.absoluteFilePath('logistic_classifier_4.json'), null, function(err, classifier) {
// 	if(err){
// 		console.log(err);
// 	}
// 	let plainScore0 = 0;
// 	let plainScore2 = 0;
// 	let plainScore10 = 0;
// 	let plainScore50 = 0;
// 	let plainScore100 = 0
// 	let scoreFilter0 = 0
// 	let scoreFilter2 = 0;
// 	let scoreFilter10 = 0;
// 	let scoreFilter50 = 0;
// 	let scoreFilter100 = 0



// 	//console.log(classifier.classify(``))
// 	plainTestData.forEach(text=>{
// 		if(classifier.classify(text) == 'plain'){
// 			// const classifications = classifier.getClassifications(text);
// 			// const testimonialScore = classifications[0].value;
// 			// const plainScore = classifications[1].value;
// 			// const factor = testimonialScore/plainScore;
// 			// if(factor > 100){
// 			// 	oldScoreFilter++
// 			// }

// 			plainScore0++
// 			plainScore2++
// 			plainScore10++
// 			plainScore50++
// 			plainScore100++
// 		} else {
// 			const classifications = classifier.getClassifications(text);
// 			const testimonialScore = classifications[0].value;
// 			const plainScore = classifications[1].value;
// 			const factor = testimonialScore/plainScore;
// 			if(factor < 100){
// 				plainScore100++
// 			} 
// 			if(factor < 50){
// 				plainScore50++
// 			} 
// 			if(factor<10){
// 				plainScore10++
// 			}  
// 			if(factor<2){
// 				plainScore2++
// 			}
// 		}

// 	})

// 	testData.forEach(text=>{
// 		if(classifier.classify(text) == 'testimonial'){
// 			const classifications = classifier.getClassifications(text);
// 			const testimonialScore = classifications[0].value;
// 			const plainScore = classifications[1].value;
// 			const factor = testimonialScore/plainScore;
// 			if(factor > 100){
// 				scoreFilter100++
// 			} 
// 			if(factor > 50){
// 				scoreFilter50++
// 			} 
// 			if(factor>10){
// 				scoreFilter10++
// 			}  
// 			if(factor>2){
// 				scoreFilter2++
// 			}
// 			scoreFilter0++
// 		}

// 	})
// 	console.log(`Classifier 5 scored ${plainScore0}/200 for the plain data test (no filter)`);
// 	console.log(`Classifier 5 scored ${plainScore2}/200 for the plain data test (filter 2)`);
// 	console.log(`Classifier 5 scored ${plainScore10}/200 for the plain data test (filter 10)`);
// 	console.log(`Classifier 5 scored ${plainScore50}/200 for the plain data test (filter 50)`);
// 	console.log(`Classifier 5 scored ${plainScore100}/200 for the plain data test (filter 100)`);
// 	console.log(`Classifier 5 scored ${scoreFilter0}/200 for the testimonial data test (no filter)`);
// 	console.log(`Classifier 5 scored ${scoreFilter2}/200 for the testimonial data test (filter 2)`);
// 	console.log(`Classifier 5 scored ${scoreFilter10}/200 for the testimonial data test (filter 10)`);
// 	console.log(`Classifier 5 scored ${scoreFilter50}/200 for the testimonial data test (filter 50)`);
// 	console.log(`Classifier 5 scored ${scoreFilter100}/200 for the testimonial data test (filter 100)`);

// });


//console.log(`Bayes New classifier scored ${oldScoreFilter} with filter`)
//console.log(`Bayes New classifier scored ${oldScore} without filter`)
// console.log(`New classifier scored ${newScoreFilter} with filter`)
// console.log(`New classifier scored ${newScore} without filter`)


// classifier.save('logistic_classifier_5.json', function(err, classifier) {
//     console.log('classifier saved!');
// });

/* Agnostic functions */
function wordCount(str) {
	if(typeof(str)=='string'){
	 	str = str.replace(/\s\s+/g, ' ');
	  	return str.split(" ").length;
  	}
}

function textExists(text,arr) {
  return arr.some(function(el) {
    return el.text === text;
  }); 
}

function countEntities(entities){
	return entities.filter(function(item, pos, arr){
	  // Always keep the 0th element as there is nothing before it
	  // Then check if each element is different than the one before it
	  return pos === 0 || item !== arr[pos-1];
	});
}

function isAuthorPreCheck(text){
	let doc = nlp(text);
	let people = doc.people().data();
	if(0<people.length && people.length<4){
		console.log(text+' PASSED')
		return true
	} else {
		return false
	}
}

function getAllIndexes(arr, val) {
    let indexes = [], i;
    for(i = 0; i < arr.length; i++)
        if (arr[i].type === val)
            indexes.push(i);
    return indexes;
}


function getDistances(arrayOfIndexes) {
	const arr = arrayOfIndexes;
	if(arr.length == 1){
		return {
			maxDistance: 2,
			minDistance: 1,
		}
	}
	let minDistance = Infinity;
	let maxDistance = 0;
	const reversedArray = arrayOfIndexes.reverse();
	let prevNumber;
	let currentNumber;
	reversedArray.forEach((index)=>{
		currentNumber = index;
		let diff = prevNumber-(currentNumber+1);
		if(diff > maxDistance){
			maxDistance = diff
		}
		if(diff < minDistance){
			minDistance = diff;
		}
		prevNumber = index;
	})
	/* Maximum possible distance is set to 5 
	(sometimes we may get really large distances when testimonials are not tagged properly)
	, any more will lead to inaccuracies */
	if(maxDistance >= 5){
		maxDistance = 5
	}
	if(minDistance == Infinity || minDistance == 0){
		minDistance = 1
	}
	if(minDistance >= 3){
		minDistance = 3
	}
	return {
		maxDistance: maxDistance,
		minDistance: minDistance,
	}
}

function getMaxDistance(arrayOfIndexes) {
	const arr = arrayOfIndexes;
	let dist = 0;
	const reversedArray = arrayOfIndexes.reverse();
	let prevNumber;
	let currentNumber;
	reversedArray.forEach((index)=>{
		currentNumber = index;
		let diff = prevNumber-currentNumber
		if(diff > dist){
			dist = diff
		}
		prevNumber = index;
	})
	/* Maximum possible distance is set to 5 
	(sometimes we may get really large distances when testimonials are not tagged properly)
	, any more will lead to inaccuracies */
	if(dist >= 5){
		dist = 5
	}
	return dist;
}

/* Testimonial functions */
async function isAuthor(text){

	// let sentence = new CoreNLP.simple.Sentence(text);
	// const result = await pipeline.annotate(sentence)
	//   	.then(sent => {
	// 	    const entities = sent.nerTags();
	// 	    const collapsedEntities = countEntities(entities);	//Makes counting easier as coreNLP tags each word within a phrase as an entity itself e.g. Luke Tan => 'PERSON','PERSON'
	// 	    let people = 0;
	// 	    let orgs = 0;
	// 	    collapsedEntities.forEach(entity=>{	// Count the number of relevant entities within the text to determine if it is an author
	// 	    	if(entity == 'PERSON'){
	// 	    		people++
	// 	    	} else if(entity == 'ORGANIZATION'){
	// 	    		orgs++
	// 	    	}
	// 	    });
	// 	    if(people == 1 || people == 2 || orgs == 1 || orgs == 2){ // For leeway, consider anything with 1-2 people, 1-2 organisations as an author *Can be varied*
	//
	// 	    	return {'text':text,'index':index}; // Return the index as well so it is easy to find the text in the array for tagging
	// 	    } else {
	// 	    	console.error(text+' FAILED')
	// 	    	return ''
	// 	    }
	    
	//   	}).catch(err =>{
	//   		console.error('stanford NER error', err);
	//   		return '';
	//   	})
	//   	.catch(async err => {
	//   		console.log('FAILED' + 'NLP' + err)	  
	//   		}

	const document = {
		content:text,
		type: 'PLAIN_TEXT',
	}
	const result = await client
	  .analyzeEntities({document: document})
	  .then(results => {
	    const entities = results[0].entities;
	    let people = 0;
	    let organizations = 0;

	    entities.forEach(entity => {
	      
	      if(entity.type == 'PERSON'){
	      	
	        people++
	      }
	      if(entity.type == 'ORGANIZATION'){
	      	organizations++
	      }
	    });
	   	

	   	if(0<people && people <3 || organizations == 1){
	   		return true
	   	} else {
	   		return false;
	   	}
	  })
	  .catch(err => {
	    console.error('google language ERROR:', err);
	    return '';
		});		
	return result;
}

async function authorScore(text){
	// const document = {
	// 	content:text,
	// 	type: 'PLAIN_TEXT',
	// }
	// const result = await client
	// 	.analyzeEntities({document: document})
	// 	.then(results => {
	// 	    const entities = results[0].entities;
	// 	    let score = 0;
	// 	    entities.forEach(entity => {
	// 	      console.log(entity)
	// 	      if(entity.type == 'PERSON'){
	// 	       	score += 3*entity.salience;
	// 	      }
	// 	      if(entity.type == 'ORGANIZATION'){
	// 	      	score += 1*entity.salience;
	// 	      }
	// 	    });
		   	
	// 	    return score;
	// 	})
	// 	.catch(err => {
	// 	    console.error('google language ERROR:', err);
	// 	    return 0;
	// 	});		
	// return result;


	const result = await pd.ner(text)
	    .then((response) => {
	        const entities = (JSON.parse(response)).entities;
	        let score = 0;
	        entities.forEach(entity => {
	        	const category = entity.category;
	        	const confidence = entity.confidence_score
	        	if(category == 'name'){
	        		score += 3*confidence;
	        	}
	        	if(category == 'organization'){
	        		score += 1*confidence;
	        	}
	        	if(category == 'group'){
	        		score += 1*confidence;
	        	}
	        })
	        return score;
	    })
	    .catch((error) => {
	        //
	        return 0;
    })
	return result;
}

async function batchAuthorScore(arr){
	const text_array = JSON.stringify(arr);
	const result = await pd.nerBatch(text_array)
	 	.then((response) => {
	 		const score_array = []
	        const everything = (JSON.parse(response)).entities;
	        everything.forEach(entities=>{
	        	let score = 0;
	        	entities.forEach(entity=>{
		        	const category = entity.category;
		        	const confidence = entity.confidence_score
		        	if(category == 'name'){
		        		score += 3*confidence;
		        	}
		        	if(category == 'organization'){
		        		score += 1*confidence;
		        	}
		        	if(category == 'group'){
		        		score += 1*confidence;
		        	}
	        	})
	        	score_array.push(score)
	        })
	        return score_array;
	    })
	    .catch((error) =>{
	        return [];
	    });
	return result;
}

function isTestimonial(text,classifier){
	if(wordCount(text) > 4 && classifier.classify(text)=='testimonial'){ // A useful testimonial should have at least 10 words
		const classifications = classifier.getClassifications(text);
		const testimonialScore = classifications[0].value;
		const plainScore = classifications[1].value;
		const factor = testimonialScore/plainScore;
		if(factor > 100){
			return true;
		} else {
			return false;
		}
	} else {
		return false;
	}
}


function testimonialFirstPersonFilter(text){
	const firstPersonMarkers = ['us','our']
	const thirdPersonMarkers = ['they','them','their','i','she','he','my','thank','his','her']

	let firstPersonScore = 0;
	let thirdPersonScore = 0;

	/* Split into constituent words */
	const textArray = text.split(' ');
	const textLength = textArray.length;
	textArray.forEach((word)=>{
		if(firstPersonMarkers.includes(word.toLowerCase())){
			firstPersonScore++
		} else if(thirdPersonMarkers.includes(word.toLowerCase)){
			thirdPersonScore++
		}
	})

	if(textLength > 60){
		if(thirdPersonScore >= firstPersonScore){
			return true;
		} else {
			return false;
		}
	} else {
		return true;
	}
}

async function getTestimonials(links){
	let promises = [];
	links.forEach(link=>{
		promises.push(classifyTestimonials(link).then(results=>{
			return results;
		}).catch(error=>{
			console.error(error);
		}));
	});
	const testimonials = await Promise.all(promises);
	return testimonials;
}

function classifyTestimonials(link){
	return new Promise((resolve,reject)=>{
		request(link,async (err,resp,body)=>{
			if(err){
				reject(err);
			}
			if(!err && resp.statusCode == 200){
				natural.LogisticRegressionClassifier.load(Assets.absoluteFilePath('logistic_classifier_5.json'), null, async function(err, classifier) {
					let $ = cheerio.load(body);
					let texts = [];
					let testimonials = [];
					let testimonialsNoFilter = [];

					$('br').each(function () {
						$(this).replaceWith(' ');
					});

					let testimonialText = '';
					$('*').not('script,style').each((index,element)=>{	// Scan ALL elements, barring in-line scripts, for potential text
						let text;
						const childNodes = $(element).childNodes;
						if(Boolean(childNodes) != false){
							childNodes.forEach(child => {
								if (
									child.type === 'tag' && 
									child.prev.type === 'text' &&
									child.prev.data.trim() !== '' && 
									child.next.type === 'text' &&
									child.next.data.trim() !== ''
								) {
									$(child).replaceWith($(child).text());
								}
							})
						}

						if($(element).children().length > 0){		// If the element has children, only get the text of the element itself
							text = $(element).first().contents().filter(function() {
							    return this.type === 'text';
							}).text().trim();	
							//
						} else {
							text = $(element).text().trim();		// Get text of the element
						} 
						/* Immediately reject texts that are empty, purely whitespace, or include unusual characters that usually signify code*/
						if(text != '' && text.replace(/\s/g, '').length && !text.includes('\\') && !text.includes('{') && !text.includes('}') && !text.includes('<') && !text.includes('>') ){ 
							if(isTestimonial(text,classifier)){
								//texts.push({'text':text,type:'testimonial'});
								testimonialText += text
							} else {
								if(testimonialText != ''){
									texts.push({'text':testimonialText,type:'testimonial'})
									testimonialText = '';
								}
								texts.push({'text':text,type:'plain'});
							}
						}
					});


					const testimonialIndexes = getAllIndexes(texts,'testimonial');
					if(testimonialIndexes.length == 0){
						resolve({testimonials:[],testimonialsNoFilter:[]});
						return;
					}

					const { maxDistance , minDistance } = getDistances(testimonialIndexes);
					//
					console.error(`MIN DISTANCE IS ${minDistance}`);
					let firstTestimonialIndex = Math.min(...testimonialIndexes);
					let lastTestimonialIndex = Math.max(...testimonialIndexes);

					let start = firstTestimonialIndex-maxDistance;

					if(start < 0){
						start = 0;
					}
					let end = lastTestimonialIndex+maxDistance;
					if(end > texts.length-1){
						end = texts.length-1
					}
					let thereIsAnAuthorBeforeTestimonial;
					let thereIsAnAuthorAfterTestimonial;
					let firstAuthorIndex;
					let lastAuthorIndex;

					let authorBeforeTestimonialTexts = []
					for(let i=firstTestimonialIndex-1; i>=start; i--){
						//console.log(i)
						const text = texts[i].text;
						authorBeforeTestimonialTexts.push(text);
						//authorBeforeTestimonialScores.push(score/(firstTestimonialIndex-i))
					}

					let authorAfterTestimonialTexts = []
					for(let i=lastTestimonialIndex+1; i<=end; i++){
						const text = texts[i].text;
						//const score = await authorScore(text);
						authorAfterTestimonialTexts.push(text);
						//authorAfterTestimonialScores.push(score/(i-lastTestimonialIndex));
					}

					const authorBeforeTestimonialScores = await batchAuthorScore(authorBeforeTestimonialTexts);
					const authorAfterTestimonialScores = await batchAuthorScore(authorAfterTestimonialTexts);
					const authorBeforeTestimonialSum = authorBeforeTestimonialScores.reduce(function(a, b) { return a + b; }, 0);
					const authorAfterTestimonialSum = authorAfterTestimonialScores.reduce(function(a, b){return a + b; }, 0);


					let slicedTexts = texts.slice(start,end+1);
					console.log(start)
					console.log(end)


					if(authorBeforeTestimonialSum <= authorAfterTestimonialSum){
						thereIsAnAuthorAfterTestimonial = true;
					} else {
						thereIsAnAuthorBeforeTestimonial = true;
					}
					
					if(thereIsAnAuthorBeforeTestimonial){
						firstAuthorIndex = firstTestimonialIndex-1-authorBeforeTestimonialScores.indexOf(Math.max(...authorBeforeTestimonialScores));
					} else {
						if(authorAfterTestimonialScores.length>0){
							lastAuthorIndex = lastTestimonialIndex+1+authorAfterTestimonialScores.indexOf(Math.max(...authorAfterTestimonialScores));
						} else {
							lastAuthorIndex = lastTestimonialIndex+1;
						}
					}

					if(thereIsAnAuthorBeforeTestimonial){
						console.error('AUTHOR BEFORE TESTIMONIAL')
						let id = 0;
						for(let index of testimonialIndexes){
							id++
							const testimonialText = texts[index].text;
							let author = ''
							let authorCounter = 0;
							let suspectedTestimonials = 0;
							for(let i = 1; i<=maxDistance; i++){
								const authorIndex = index-i
								if(authorCounter >= minDistance || testimonialIndexes.includes(authorIndex) || author != '' && suspectedTestimonials > 0){
									if(testimonialIndexes.includes(authorIndex)){
										console.log('breakING')
									}
									break;
								}
								const authorText = texts[authorIndex].text;
								const lowAuthorText = authorText.toLowerCase();
								if(
									!lowAuthorText.includes('thank') && 	//Authors usually don't have these words... right??
									!lowAuthorText.includes('regard') && 
									!lowAuthorText.includes('forward') && 
									!lowAuthorText.includes('wish') &&
									!lowAuthorText.includes('more') &&
									!lowAuthorText.includes('testimonial') &&
									!lowAuthorText.includes('want') &&
									!lowAuthorText.includes('sign up') &&
									wordCount(lowAuthorText) < 20 && //An author can't have more than 10 words... right??
									authorCounter < minDistance &&
									lowAuthorText.length>2
								) {
									authorCounter++;
									author += `${authorText} | `
								} else {
									suspectedTestimonials++
								}

							}
							const testimonial = {
								id:'testimonial_'+String(id),
								text:testimonialText,
								author: author
							}
							testimonials.push(testimonial);
						}
					} else {
						console.error('AUTHOR AFTER TESTIMONIAL')
						let id = 0;
						for(let index of testimonialIndexes){
							id++
							const testimonialText = texts[index].text;
							let author = ''
							let authorCounter = 0;
							let suspectedTestimonials = 0;
							for(let i = 1; i<=maxDistance; i++){
								const authorIndex = index+i
								if(authorCounter >= minDistance || testimonialIndexes.includes(authorIndex) || author != '' && suspectedTestimonials > 0){
									break;
								}
								const authorText = texts[authorIndex].text;
								const lowAuthorText = authorText.toLowerCase();
								if(
									!lowAuthorText.includes('thank') && //Authors usually don't have these words... right??
									!lowAuthorText.includes('regard') && 
									!lowAuthorText.includes('forward') && 
									!lowAuthorText.includes('wish') &&
									!lowAuthorText.includes('more') &&
									!lowAuthorText.includes('testimonial') &&
									!lowAuthorText.includes('want') &&
									!lowAuthorText.includes('sign up') &&
									wordCount(lowAuthorText) < 20 && //An author can't have more than 10 words... right??
									lowAuthorText.length>2 &&
									authorCounter < minDistance
								) {
									authorCounter++;
									author += `${authorText} | `
								} else {
									suspectedTestimonials++
								}
							}
							const testimonial = {
								id:'testimonial_'+String(id),
								text:testimonialText,
								author: author
							}
							testimonials.push(testimonial)
						}
					}


					resolve({
						testimonials:testimonials,
						testimonialsNoFilter:testimonials,
					})
				});
			}
		});
	});
}




Meteor.methods({
	async getTestimonials(url){

		let promises = [];

		const testimonialLinks = await new Promise((resolve,reject)=>{
			request(url, (err,resp,body)=>{
				if(err){
					reject(err);
				}

				let $ = cheerio.load(body);

				let testimonialLinks = [];
				//testimonialLinks.push(url); //Feed initial URL back in for easy looping(may need to change to help performance)

				$('a').each(function(i, link){
					let href = $(link).attr('href');
					if(href !== undefined){
						const hrefLowerCase = href.toLowerCase();
						if(href[href.length -1] == '/'){
							href = href.slice(0, -1);
						}
						// const link = nodeurl.format({
						//   protocol: 'http',
						//   hostname: url,
						//   pathname: href
						// });
						const link = nodeurl.resolve(url,href);
						/* 
							Consider all links that contain the word 'testimonial' inside is a valid link with testimonials
							Reject links that contain a '#'' as it just points to the home page and we dont want to make excess queries
							Reject links that are already inside the array in case there are multiple links pointing to the same url 
						*/
						if( (hrefLowerCase.includes('testimonial') || 
							hrefLowerCase.includes('review')) && 
							!(hrefLowerCase.includes('#')) && 
							!(testimonialLinks.includes(link))
						) {
							testimonialLinks.push(link);
						}
					}
				});
				if(testimonialLinks.length == 0){
					testimonialLinks.push(url);
				}

				resolve(testimonialLinks);
			});
		}).then((result)=>{
			return result;
		}).catch((error)=>{
			return [];
		})

		let testimonialsUnflattened = await getTestimonials(testimonialLinks);
		//const testimonials = testimonialsUnflattened.flatten();
		let testimonials = []
		let testimonialsNoFilter = []
		testimonialsUnflattened.forEach(obj=>{
			testimonials.push(obj.testimonials);
			testimonialsNoFilter.push(obj.testimonialsNoFilter);
		})

		testimonials = testimonials.flatten();
		testimonialsNoFilter = testimonialsNoFilter.flatten();
		
		let testimonialsNoDupes = [];
		testimonials.forEach(testimonial=>{ 		//Remove all duplicates within the array (whether it be same testimonial or same author)
			if(!testimonialsNoDupes.some(element => element.text === testimonial.text || element.author === testimonial.author)) {
			  testimonialsNoDupes.push(testimonial);
			}
		});
		let testimonialsNoFilterNoDupes = [];
		testimonialsNoFilter.forEach(testimonial=>{ 		//Remove all duplicates within the array (whether it be same testimonial or same author)
			if(!testimonialsNoFilterNoDupes.some(element => element.text === testimonial.text || element.author === testimonial.author)) {
			  testimonialsNoFilterNoDupes.push(testimonial);
			}
		});

		return {testimonials:testimonialsNoDupes,testimonialsNoFilter:testimonialsNoFilterNoDupes};
	},
	updateTestimonials(text,type){
		const existsInCorrectCollection = Boolean(CorrectTestimonialCollection.findOne({text: text}));
		const existsInWrongCollection   = Boolean(WrongTestimonialCollection.findOne({text: text}));
		switch(type){
			case 'correct':
				if(!existsInCorrectCollection ){
					CorrectTestimonialCollection.insert({
						text: text,
					});
				}
				if(existsInWrongCollection){
					WrongTestimonialCollection.remove({
						text: text,
					});				
				}
				break
			case 'wrong':
				if(!existsInWrongCollection){
					WrongTestimonialCollection.insert({
						text: text,
					});
				}
				if(existsInCorrectCollection){
					CorrectTestimonialCollection.remove({
						text: text,
					});
				}
				break
		}
	},
	testScores(text,type,scores){
		const existsInTruePositives = Boolean(truePositives.findOne({text: text}));
		const existsInFalsePositives   = Boolean(falsePositives.findOne({text: text}));
		switch(type){
			case 'correct':
				if(!existsInTruePositives ){
					truePositives.insert({
						text: text,
						scores:scores
					});
				}
				if(existsInFalsePositives){
					falsePositives.remove({
						text: text,
						scores:scores
					});				
				}
				break
			case 'wrong':
				if(!existsInFalsePositives){
					falsePositives.insert({
						text: text,
						scores:scores
					});
				}
				if(existsInTruePositives){
					truePositives.remove({
						text: text,
						scores:scores
					});
				}
				break
		}
	}
});



