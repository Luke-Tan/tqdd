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

/*Internal modules*/
import { CorrectTestimonialCollection , WrongTestimonialCollection , truePositives, falsePositives } from '../../both/collections/TestimonialCollection.js';

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
//var bayes = new natural.bayesClassifier();

testimonialData.forEach((testimonial)=>{
	bayes.addDocument(testimonial,'testimonial');
	//bayes.addDocument(testimonial,'testimonial');
});

plainData.forEach((doc)=>{
	bayes.addDocument(doc,'plain');
	//bayes.addDocument(doc,'plain');
});

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

let counter = 0;
/* Testimonial functions */
async function isAuthor(text,index){
	let sentence = new CoreNLP.simple.Sentence(text);
	const result = await pipeline.annotate(sentence)
	  	.then(sent => {
		    const entities = sent.nerTags();
		    const collapsedEntities = countEntities(entities);	//Makes counting easier as coreNLP tags each word within a phrase as an entity itself e.g. Luke Tan => 'PERSON','PERSON'
		    let people = 0;
		    let orgs = 0;
		    collapsedEntities.forEach(entity=>{	// Count the number of relevant entities within the text to determine if it is an author
		    	if(entity == 'PERSON'){
		    		people++
		    	} else if(entity == 'ORGANIZATION'){
		    		orgs++
		    	}
		    });
		    if(people == 1 || people == 2 || orgs == 1 || orgs == 2){ // For leeway, consider anything with 1-2 people, 1-2 organisations as an author *Can be varied*
		    	console.log(text +' PASSED');
		    	return {'text':text,'index':index}; // Return the index as well so it is easy to find the text in the array for tagging
		    } else {
		    	console.error(text+' FAILED')
		    	return ''
		    }
	    
	  	}).catch(err =>{
	  		console.error('stanford NER error', err);
	  		return '';
	  	})
	//   	.catch(async err => {
	  		//console.log('FAILED' + 'NLP' + err)	  
			// const document = {
			// 	content:text,
			// 	type: 'PLAIN_TEXT',
			// }
			// const result = await client
			//   .analyzeEntities({document: document})
			//   .then(results => {
			//     const entities = results[0].entities;
			//     let people = 0;
			//     let organizations = 0;

			//     entities.forEach(entity => {
			      
			//       if(entity.type == 'PERSON'){
			      	
			//         people++
			//       }
			//       if(entity.type == 'ORGANIZATION'){
			//       	organizations++
			//       }
			//     });
			   	

			//    	if(0<people && people <3 || organizations == 1){
			//    		console.log(text);
			//    		return {'text':text,'index':index};
			//    	} else {
			//    		return '';
			//    	}
			//   })
			//   .catch(err => {
			//     console.error('google language ERROR:', err);
			//     return '';
			// });		
	    	// console.log(text+' FAILED')
	    	// return '';
	 	//});
	//counter++
	return result;
}

function isTestimonial(text){
	if(wordCount(text) > 9 && bayes.classify(text)=='testimonial'){ // A useful testimonial should have at least 10 words
		return true;
	} else {
		return false;
	}
}

async function getTestimonials(links){
	let promises = [];
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
		request(link,(err,resp,body)=>{
			if(err){
				reject(err);
			}
			if(!err && resp.statusCode == 200){
				let $ = cheerio.load(body);
				let texts = [];
				let testimonials = [];

				$('*').not('script style').each((index,element)=>{	// Scan ALL elements, barring in-line scripts, for potential text
					let text;
					if($(element).children().length > 0){		// If the element has children, only get the text of the element itself
						text = $(element).first().contents().filter(function() {
						    return this.type === 'text';
						}).text().trim();	
					} else {
						text = $(element).text().trim();		// Get text of the element
					} 
					/* Immediately reject texts that are empty, purely whitespace, or include unusual characters that usually signify code*/
					if(text != '' && text.replace(/\s/g, '').length && !text.includes('\\') && !text.includes('{') && !text.includes('}') && !text.includes('<') && !text.includes('>')){ 
						texts.push(text);
					}
				});
				
				let authorPromises = [];
				//console.log(texts);
				let testimonialText = '';
				let id = 0;
				//console.log(texts);
				texts.forEach((item,index)=>{
					const text = item;
					const lowtext = text.toLowerCase();
					if(isTestimonial(text)){
						testimonialText += text;
					} else if(testimonialText != '' && !lowtext.includes('thank') && !lowtext.includes('regard') && !lowtext.includes('forward') && 
						!lowtext.includes('forward') && !lowtext.includes('wish') && text.length>2){
						let author = text;
						id++

						let scores = bayes.getClassifications(testimonialText);
						let testimonial = {
							'id':'testimonial_'+String(id),
							'text':testimonialText,
							'author':author,
							'scores':scores
						}
						testimonialText = '';
						testimonials.push(testimonial);
					}
				})
				resolve(testimonials);

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
			testimonialLinks.push(url); //Feed initial URL back in for easy looping(may need to change to help performance)

			$('a').each(function(i, link){
				const href = $(link).attr('href');
				if(href !== undefined){
					const hrefLowerCase = href.toLowerCase();
					const link = nodeurl.resolve(url,href);
					// Consider all links that contain the word 'testimonial' inside is a valid link with testimonials
					// Reject links that contain a '#'' as it just points to the home page and we dont want to make excess queries
					// Reject links that are already inside the array in case there are multiple links pointing to the same url
					if(hrefLowerCase.includes('testimonial') || hrefLowerCase.includes('review') && !(hrefLowerCase.includes('#')) && !testimonialLinks.includes(link)){
						testimonialLinks.push(link);
					}
				}
			});

			console.log(testimonialLinks);
			future['return'](testimonialLinks);
		});

		let testimonialLinks = future.wait();
		let testimonialsUnflattened = await getTestimonials(testimonialLinks);
		const testimonials = testimonialsUnflattened.flatten();
		let testimonialsNoDupes = [];
		testimonials.forEach(testimonial=>{ 		//Remove all duplicates within the array (whether it be same testimonial or same author)
			if(!testimonialsNoDupes.some(element => element.text === testimonial.text || element.author === testimonial.author)) {
			  testimonialsNoDupes.push(testimonial);
			}
		});
		console.log(counter);
		return testimonialsNoDupes;
	},
	updateTestimonials(text,type){
		const existsInCorrectCollection = Boolean(CorrectTestimonialCollection.findOne({text: text}));
		const existsInWrongCollection   = Boolean(WrongTestimonialCollection.findOne({text: text}));
		console.log(existsInWrongCollection)
		console.log(existsInCorrectCollection)
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
		console.log(existsInTruePositives);
		console.log(existsInFalsePositives);
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
	},
	getData(){
		const truePositivesCollection = truePositives.find({}).fetch();
		const falsePositivesCollection = falsePositives.find({}).fetch();

		const truePositivesLength = truePositivesCollection.length;
		const falsePositivesLength = falsePositives.length;


		let truePositivesMaxFactor = 0;
		let falsePositivesMaxFactor = 0;

		let truePositivesTotalFactor;
		let falsePositivesTotalFactor;

		truePositivesCollection.forEach(doc=>{
			let scores = doc.scores;
			let testimonialScore = scores[0].value;
			let plainScore = scores[1].value;
			const factor = testimonialScore/plainScore
			if(factor>truePositivesMaxFactor){
				truePositivesMaxFactor = factor;
			}
			truePositivesTotalFactor += factor;
		})

		falsePositivesCollection.forEach(doc=>{
			let scores = doc.scores;
			let testimonialScore = scores[0].value;
			let plainScore = scores[1].value;
			const factor = testimonialScore/plainScore
			if(factor>falsePositivesMaxFactor){
				falsePositivesMaxFactor = factor;
			}
			falsePositivesTotalFactor += factor;
		})		

		const truePositivesAverageFactor = truePositivesTotalFactor/truePositivesLength;
		const falsePositivesAverageFactor = falsePositivesTotalFactor/falsePositivesLength;

		console.log(falsePositivesCollection);
		console.log(falsePositivesMaxFactor);
		console.log(truePositivesCollection); 
		console.log(truePositivesMaxFactor);
	}
});



