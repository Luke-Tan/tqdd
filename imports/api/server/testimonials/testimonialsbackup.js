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

/* Instantiate coreNLP server */
const props = new Properties({
  annotators: 'ner',
});

const connector = new ConnectorServer({ dsn: 'https://fast-crag-55472.herokuapp.com/' });

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

function wordCount(str) { 
 	str = str.replace(/\s\s+/g, ' ');
  	return str.split(" ").length;
}

function isAuthorPreCheck(text){
	let doc = nlp(text);
	let people = doc.people().data();
	if(0<people.length && people.length<4){
		return true
	} else {
		return false
	}
}

// async function isAuthor(text,element){

// 	const document = {
// 		content:text,
// 		type: 'PLAIN_TEXT',
// 	}
// 	count();
// 	const result = await client
// 	  .analyzeEntities({document: document})
// 	  .then(results => {
// 	    const entities = results[0].entities;
// 	    let people = 0;
// 	    let organizations = 0;

// 	    entities.forEach(entity => {
	      
// 	      if(entity.type == 'PERSON'){
	      	
// 	        people++
// 	      }
// 	      if(entity.type == 'ORGANIZATION'){
// 	      	organizations++
// 	      }
// 	    });
	   	
// 	   	if(0<people && people <3 || organizations == 1){
// 	   		console.log(text);
// 	   		return {'text':text,'element':element};
// 	   	} else {
// 	   		return '';
// 	   	}
// 	  })
// 	  .catch(err => {
// 	    console.error('ERROR:', err);
// 	    return '';
// 	});

// 	return result;

// }

function countEntities(entities){
	return entities.filter(function(item, pos, arr){
	  // Always keep the 0th element as there is nothing before it
	  // Then check if each element is different than the one before it
	  return pos === 0 || item !== arr[pos-1];
	});
}

async function isAuthor(text){
	const sentence = new CoreNLP.simple.Sentence(text);
	pipeline.annotate(sentence)
	  	.then(sent => {
		    //console.log('parse', sent.parse());
		    const entities = sent.nerTags();
		    const collapsedEntities = countEntities(entities);
		    let people = 0;
		    let orgs = 0;
		    collapsedEntities.forEach(entity=>{
		    	if(entity == 'PERSON'){
		    		people++
		    	} else if(entity == 'ORGANIZATION'){
		    		orgs++
		    	}
		    });
		    if(people == 1 || people == 2 || orgs == 1 || orgs == 2){
		    	return text
		    } else {
		    	return ''
		    }
	    
	  	})
	  	.catch(err => {
	    	console.log('err', err);
	 	});
}



function isTestimonial(text){
	if(wordCount(text) > 10 && bayes.classify(text)=='testimonial'){
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

				function getLeaves(parent, result = []) {
				  let children = $(parent).children('div,container,section,ul,li,article');
				  if(children.length > 0){
				    children.each((i, elem) => getLeaves(elem, result)) 
				  }else{
				  	if(!$(parent).is('body')){
				    	result.push(parent)
					}
				  }
				  return result
				}

				const leaves = getLeaves('body');
				
				$(leaves).each((index,element)=>{
				    $(element).addClass('leaf');
				});

				$('br').replaceWith(', ');
				const textElements = $('p,q,h1,h2,h3,h4,h5,h6,span,.leaf');	//Attempt to get all text based HTML elements
				let vetos = [];
				let testimonials = [];

				let authorPromises = [];

				textElements.each((index,element)=>{
					// const text = $(element).first().contents().filter(function() {
					//     return this.type === 'text';
					// }).text();

					let text = $(element).text().trim();
					if($(element).is('div')){
						text = $(element).first().contents().filter(function() {
						    return this.type === 'text';
						}).text();
					}

					if(isTestimonial(text)){
						$(element).addClass('testimonial');
					} else if(wordCount(text) < 15 && text.length < 110){	// Detects the entities inside of  of the text IF text has less than 10 words-> Reduce querys to google API
						if(!$(element).is('.leaf')){
							if(isAuthorPreCheck(text)){
								$(element).addClass('author')	//Attempt to reduce google API calls by first running through a less accurate NER classifier
							} else {
								authorPromises.push(isAuthor(text,element)); //Necessary to wrap in a promise as Google NER returns a promise					
							}
						}
					}	
				});

				Promise.all(authorPromises).then(result=>{
					result.forEach((item)=>{
						if(item != ''){
							const element = item.element;
							$(element).addClass('author');
						}
					});

					const filteredText = $.html('.testimonial,.author');
					$ = cheerio.load(filteredText);
					//console.log($.html());

					$('.testimonial').each((index,element)=>{
						let text = $(element).text().trim();
						//console.log(text);
						if($(element).is('div')){
							text = $(element).first().contents().filter(function() {
							    return this.type === 'text';
							}).text();
						}
						console.log(text);

						let testimonial = '';
						if(!vetos.includes(text)){
							testimonial += text;
							let remainingTestimonial = $(element).nextUntil('.author');
							//console.log(remainingTestimonial);
							const paragraphLength = remainingTestimonial.length;
							if(paragraphLength > 0){
								remainingTestimonial.each((index2,element2)=>{
									let text = $(element2).text().trim();
									if($(element2).is('div')){
										text = $(element).first().contents().filter(function() {
										    return this.type === 'text';
										}).text();
									}
									//console.log(text);
									testimonial += text
									//console.log(text);
									vetos.push(text);
									if(paragraphLength-1 == index2){
										const author = $(element2).next().text();
										testimonials.push({'text':testimonial,'author':author})
									}
								});
							} else {
								const author = $(element).next().text();
								testimonials.push({'text':testimonial,'author':author});
							}
						}
					})
					//console.log(vetos);
					resolve(testimonials);

				}).catch(err => {
				    console.error('ERROR:', err);
				});;
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

			const links = $('a');
			//let texts = $('p');
			let testimonialLinks = [];

			testimonialLinks.push(url);
			$(links).each(function(i, link){
				const href = $(link).attr('href');
				if(href !== undefined){
					const hrefLowerCase = href.toLowerCase();
					const link = nodeurl.resolve(url,href);
					if(hrefLowerCase.includes('testimonial') && !(hrefLowerCase.includes('#')) && !testimonialLinks.includes(link)){
						// const link = nodeurl.resolve(url,href);
						testimonialLinks.push(link);
					}
				}
			});

			console.log(testimonialLinks);
			future["return"](testimonialLinks);
		});

		let testimonialLinks = future.wait();
		let testimonialsUnflattened = await getTestimonials(testimonialLinks);
		const testimonials = testimonialsUnflattened.flatten();
		let testimonialsNoDupes = [];
		testimonials.forEach(testimonial=>{
			if(!testimonialsNoDupes.some(element => element.text === testimonial.text || element.author === testimonial.author)) {
			  testimonialsNoDupes.push(testimonial);
			}
		});
		console.log(counter);
		return testimonialsNoDupes;
	},
});



