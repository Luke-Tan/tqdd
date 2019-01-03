/*Npm Modules */
import natural from 'natural';
import Future from 'fibers/future';
import cheerio from 'cheerio';
import request from 'request';
import nodeurl from 'url';
import nlp from 'compromise';
import { testimonialData, plainData } from './trainingdata.js';
import language from '@google-cloud/language';
import CoreNLP, { Properties, Pipeline, ConnectorServer } from 'corenlp';
import pd from 'paralleldots';

/*Internal modules*/
import { CorrectTestimonialCollection , WrongTestimonialCollection , truePositives, falsePositives } from '../../both/collections/TestimonialCollection.js';

/* Instantiate paralleldots */
pd.apiKey = "l6SW7NUATYudvEHJE1dgWvg0AZACODHjGm65vH43Es8";

/* Instantiate coreNLP server */
const props = new Properties({
  annotators: 'ner',
});

const connector = new ConnectorServer({ dsn: 'https://fast-crag-55472.herokuapp.com/' });	// URL of internally set up stanford CoreNLP server

const pipeline = new Pipeline(props, 'English', connector);

/* Instantiates Google Cloud Natural Language client */
const client = new language.LanguageServiceClient({
	projectId: Meteor.settings.PROJECT_ID,
	credentials: {
		private_key: Meteor.settings.private_key.replace(/\\n/g, '\n'),
		client_email: Meteor.settings.client_email
	}
});

let bayes = new natural.BayesClassifier();
//var bayes = new natural.BayesClassifier();

const testimonialUserData = CorrectTestimonialCollection.find({}).fetch();

const plainUserData = WrongTestimonialCollection.find({}).fetch();


testimonialUserData.forEach((testimonial)=>{
	bayes.addDocument(testimonial.text,'testimonial');
})

testimonialData.forEach((testimonial)=>{
	bayes.addDocument(testimonial,'testimonial');
	//bayes.addDocument(testimonial,'testimonial');
});

plainData.forEach((plain)=>{
	bayes.addDocument(plain,'plain');
	//bayes.addDocument(doc,'plain');
});

plainUserData.forEach((plain)=>{
	bayes.addDocument(plain.text,'plain')
})

bayes.train();

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
	// 	    	console.log(text +' PASSED');
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
	        	console.log(entity);
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
	        //console.log(error);
	        return 0;
    })
	return result;
}

async function batchAuthorScore(arr){
	console.log(arr);
	const text_array = JSON.stringify(arr);
	const result = await pd.nerBatch(text_array)
	 	.then((response) => {
	 		const score_array = []
	        const everything = (JSON.parse(response)).entities;
	        console.log(everything);
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
	        console.log(error);
	        return [];
	    });
	return result;
}

function isTestimonial(text){
	if(wordCount(text) > 4 && bayes.classify(text)=='testimonial'){ // A useful testimonial should have at least 10 words
		const classifications = bayes.getClassifications(text);
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
	console.log(links);
	links.forEach(link=>{
		promises.push(classifyTestimonials(link).then(results=>{
			return results;
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
				let $ = cheerio.load(body);
				let texts = [];
				let testimonials = [];
				let testimonialsNoFilter = [];

				$('strong,u,a').each(function () {
					$(this).replaceWith($(this).text()+' ');
				});

				let testimonialText = '';
				$('*').not('script,style').each((index,element)=>{	// Scan ALL elements, barring in-line scripts, for potential text
					let text;
					if($(element).children().length > 0){		// If the element has children, only get the text of the element itself
						text = $(element).first().contents().filter(function() {
						    return this.type === 'text';
						}).text().trim();	
						//console.log(text);
					} else {
						text = $(element).text().trim();		// Get text of the element
					} 
					/* Immediately reject texts that are empty, purely whitespace, or include unusual characters that usually signify code*/
					if(text != '' && text.replace(/\s/g, '').length && !text.includes('\\') && !text.includes('{') && !text.includes('}') && !text.includes('<') && !text.includes('>') ){ 
						if(isTestimonial(text)){
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

				const maxDistance = getMaxDistance(testimonialIndexes);
				let firstTestimonialIndex = Math.min(...testimonialIndexes);
				let lastTestimonialIndex = Math.max(...testimonialIndexes);
				console.log(maxDistance);

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
				console.log(slicedTexts);


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
					/* Assume author appears BEFORE the testimonials */
					console.error('AUTHOR BEFORE TESTIMONIALS');
					let testimonialText = '';
					//console.log(firstAuthorIndex);
					let authorText = texts[firstAuthorIndex].text + ' ';
					let id = 0;
					for(i=firstAuthorIndex+1; i<end; i++){
						// console.log(i);
						// console.log(texts[i]);
						const text = texts[i].text;
						const type = texts[i].type;
						const lowtext = text.toLowerCase();
						if(type == 'testimonial'){
							testimonialText = text;
							if(authorText != ''){
								id++;
								let testimonial = {
									id:'testimonial_'+String(id),
									text:testimonialText,
									author:authorText
								}
								testimonials.push(testimonial);
								testimonialText = '';
								authorText = '';
							}
						} else if(!lowtext.includes('thank') && !lowtext.includes('regard') && !lowtext.includes('forward') && !lowtext.includes('wish') && text.length>2){
							authorText += `${text} `
						}
					}
				} else {
					/* Assume author appears AFTER the testimonials */
					console.error('AUTHOR AFTER TESTIMONIALS');
					let testimonialText = texts[firstTestimonialIndex].text;
					let authorText = '';
					let id = 0;
					for(let i=firstTestimonialIndex+1; i<=lastAuthorIndex; i++){
						//console.log(testimonialText);
						const text = texts[i].text;
						//console.log(text);
						const type = texts[i].type;
						const lowtext = text.toLowerCase();
						/* Add each strung testimonial+author when the next testimonial is reached, or if nothing is left.*/
						if(type == 'testimonial'){
							id++
							let testimonial = {
								id: 'testimonial_'+String(id),
								text: testimonialText,
								author: authorText,
							}
							testimonials.push(testimonial);
							authorText = '';
							testimonialText = text
						} else if(testimonialText != '' && !lowtext.includes('thank') && !lowtext.includes('regard') && !lowtext.includes('forward') && !lowtext.includes('wish') && text.length>2){
							authorText += `${text} `
							if(i==lastAuthorIndex){
								id++
								let testimonial = {
									id: 'testimonial_'+String(id),
									text: testimonialText,
									author: authorText,
								}
								testimonials.push(testimonial);
								authorText = '';
								testimonialText = text
							}
						}
					}
				}
				// if(authorBeforeTestimonial && !authorAfterTestimonial){
				// 	/* Assume author appears BEFORE the testimonials */
				// 	let testimonialText = '';
				// 	let id = 0;
				// 	const reversedTexts = slicedTexts.slice().reverse();
				// 	reversedTexts.forEach((item,index)=>{
				// 		const text = item.text;
				// 		const type = item.type;
				// 		const lowtext = text.toLowerCase();
				// 		if(type == 'testimonial'){
				// 			testimonialText = text + testimonialText;
				// 		} else if(testimonialText != '' && !lowtext.includes('thank') && !lowtext.includes('regard') && !lowtext.includes('forward') && !lowtext.includes('wish') && text.length>2){
				// 			let author = text;
				// 			id++
				// 			let testimonial = {
				// 				id:'testimonial_'+String(id),
				// 				text:testimonialText,
				// 				author:author,
				// 			}
				// 			testimonials.push(testimonial);
				// 			testimonialText =''
				// 		}
				// 	})
				// } else {
				// 	/* Assume author appears AFTER the testimonials */
				// 	let testimonialText = '';
				// 	let id = 0;
				// 	slicedTexts.forEach((item,index)=>{
				// 		const text = item.text;
				// 		const type = item.type;
				// 		const lowtext = text.toLowerCase();
				// 		if(type == 'testimonial'){
				// 			testimonialText += text
				// 		} else if(testimonialText != '' && !lowtext.includes('thank') && !lowtext.includes('regard') && !lowtext.includes('forward') && !lowtext.includes('wish') && text.length>2){
				// 			let author = text;
				// 			id++
				// 			let testimonial = {
				// 				id: 'testimonial_'+String(id),
				// 				text: testimonialText,
				// 				author: author,
				// 			}
				// 			testimonials.push(testimonial);
				// 			testimonialText = '';
				// 		}
				// 	})
				// }
				resolve({
					testimonials:testimonials,
					testimonialsNoFilter:testimonials,
				})
				// let authorPromises = [];
				// //console.log(texts);
				// let testimonialText = '';
				// let id = 0;
				// //console.log(texts);
				// //console.log(texts)
				// console.log(texts);

				// texts.forEach((item,index)=>{
				// 	const text = item.trim();
				// 	const lowtext = text.toLowerCase();
				// 	if(isTestimonial(text)){
				// 		testimonialText += text;
				// 	} else if(testimonialText != '' && !lowtext.includes('thank') && !lowtext.includes('regard') && !lowtext.includes('forward') && !lowtext.includes('wish') && text.length>2){
				// 		let author = text;
				// 		id++

				// 		let scores = bayes.getClassifications(testimonialText);
				// 		let testimonial = {
				// 			'id':'testimonial_'+String(id),
				// 			'text':testimonialText,
				// 			'author':author,
				// 			'scores':scores
				// 		}
				// 		const classifications = bayes.getClassifications(testimonialText);
				// 		const testimonialScore = classifications[0].value;
				// 		const plainScore = classifications[1].value;
				// 		const factor = testimonialScore/plainScore;
				// 		if(factor > 100){
				// 			testimonialsNoFilter.push(testimonial);
				// 			if(testimonialFirstPersonFilter(testimonialText)){
				// 				testimonials.push(testimonial)
				// 			}
				// 		}
				// 		testimonialText = '';

				// 	//	testimonialsNoFilter.push(testimonial);
				// 	}
				// })

				// //resolve([testimonials,testimonialsNoFilter]);
				// resolve({
				// 	testimonials:testimonials,
				// 	testimonialsNoFilter:testimonialsNoFilter,
				// })

				/*
				texts.forEach((item,index)=>{
					let text = item.text.toLowerCase();		//Set to lower case to allow for easier manipulation
					if(isTestimonial(text)){
						item.class = 'testimonial';
					} else if(isAuthorPreCheck(text)){		// Attempt to classify as many authors as possible with less accurate method
						item.class = 'author';
					} else if(wordCount(text)<9 && text.length > 2){	// Potential authors are between 2 characters and 9 words in length 
						authorPromises.push(isAuthor(text,index));	// Necessary to use promises as CoreNLP returns a promise
					}
				});


				Promise.all(authorPromises).then(results=>{	 // Wait for all of the author promises to resolve 
					results.forEach((item)=>{
						if(item != ''){
							let index = item.index
							texts[index].class='author'; 	//Tag all entities within the array as an author using results from Promise.all
						}
					});

					var testimonialTexts = texts.filter((item)=>{	//Flatten array and remove all objects that do NOT contain a testimonial or author class
						return item.class;	
					});	
					console.log(testimonialTexts);
					let testimonialText = ''
					let id = 0;
					//console.log(testimonialTexts);
					testimonialTexts.forEach((item,index)=>{							// Begin stringing each testimonial together
						if(item.class == 'testimonial'){								 
							testimonialText += item.text 								// If a text is a testimonial, add on to the current block of text
						} else if(item.class == 'author' && testimonialText != ''){     // If a text is an author AND there is a current non-empty block of text, take the current block of text as the full testimonial
							let author = item.text 	
							id++														// Simple ID to be added to testimonial for use in DOM			
							let testimonial = {'id':'testimonial_'+String(id),'text':testimonialText,'author':author}  // The complete testimonial object
							testimonialText = '';										// Reset the block of text to begin stringing of next testimonial
							testimonials.push(testimonial);								// Push the full testimonial and author to the testimonials array
						}
					});
					//console.log(vetos);
					resolve(testimonials);

				}).catch(err => {
				    console.error('ERROR:', err);
				});
				*/
			}
		});
	});
}




Meteor.methods({
	async getTestimonials(url){

		let future = new Future();
		let promises = [];

		request(url, (err,resp,body)=>{

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
					const link = nodeurl.resolve(url,href);
					/* 
						Consider all links that contain the word 'testimonial' inside is a valid link with testimonials
						Reject links that contain a '#'' as it just points to the home page and we dont want to make excess queries
						Reject links that are already inside the array in case there are multiple links pointing to the same url 
					*/
					if((hrefLowerCase.includes('testimonial') || hrefLowerCase.includes('review')) && !(hrefLowerCase.includes('#')) && !(testimonialLinks.includes(link))){
						testimonialLinks.push(link);
					}
				}
			});
			if(testimonialLinks.length == 0){
				testimonialLinks.push(url);
			}

			future['return'](testimonialLinks);
		});

		let testimonialLinks = future.wait();
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



