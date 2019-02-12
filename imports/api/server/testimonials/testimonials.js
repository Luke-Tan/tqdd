/*Npm Modules */
import natural from 'natural';
import cheerio from 'cheerio';
import request from 'request';
import nodeurl from 'url';
import nlp from 'compromise';
import language from '@google-cloud/language';
import pd from 'paralleldots';
/*Internal modules*/
import { CorrectTestimonialCollection , WrongTestimonialCollection , truePositives, falsePositives } from '../../both/collections/TestimonialCollection.js';
import { getAllIndexes } from '../all/functions.js';

/* Instantiate paralleldots */
pd.apiKey = "l6SW7NUATYudvEHJE1dgWvg0AZACODHjGm65vH43Es8";

/* Instantiates Google Cloud Natural Language client */
const client = new language.LanguageServiceClient({
	projectId: Meteor.settings.PROJECT_ID,
	credentials: {
		private_key: Meteor.settings.private_key.replace(/\\n/g, '\n'),
		client_email: Meteor.settings.client_email
	}
});


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
async function authorScore(text){
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
		if(factor > 50){
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

								let link = $(element).attr('href');
								if(link && !link.includes('#')){
									const href = nodeurl.resolve(link,$(element).attr('href'));
									texts.push({text:text,type:'href',href:href})
								} else { 
									texts.push({'text':text,type:'plain'});
								}
							}
						}
					});


					console.log(texts);


					const testimonialIndexes = getAllIndexes(texts,'testimonial');
					if(testimonialIndexes.length == 0){
						resolve({testimonials:[]});
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
						const text = texts[i].text;
						authorBeforeTestimonialTexts.push(text);
					}

					let authorAfterTestimonialTexts = []
					for(let i=lastTestimonialIndex+1; i<=end; i++){
						const text = texts[i].text;
						authorAfterTestimonialTexts.push(text);
					}

					const authorBeforeTestimonialScores = await batchAuthorScore(authorBeforeTestimonialTexts);
					const authorAfterTestimonialScores = await batchAuthorScore(authorAfterTestimonialTexts);
					const authorBeforeTestimonialSum = authorBeforeTestimonialScores.reduce(function(a, b) { return a + b; }, 0);
					const authorAfterTestimonialSum = authorAfterTestimonialScores.reduce(function(a, b){return a + b; }, 0);


					let slicedTexts = texts.slice(start,end+1);

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
							let href = ''
							let authorCounter = 0;
							let suspectedTestimonials = 0;
							for(let i = 1; i<=maxDistance; i++){
								const authorIndex = index-i
								if(authorCounter >= minDistance || testimonialIndexes.includes(authorIndex) || author != '' && suspectedTestimonials > 0){
									break;
								}
								const authorText = texts[authorIndex].text;
								const type = texts[authorIndex].type;
								const lowAuthorText = authorText.toLowerCase();
								if(type == 'href' && href == ''){
									href = texts[authorIndex].href;
								} else if (
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
								author: author,
								href: href,
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
							let href = ''
							let authorCounter = 0;
							let suspectedTestimonials = 0;
							for(let i = 1; i<=maxDistance; i++){
								const authorIndex = index+i
								if(authorCounter >= minDistance || testimonialIndexes.includes(authorIndex) || author != '' && suspectedTestimonials > 0){
									break;
								}
								const authorText = texts[authorIndex].text;
								const type = texts[authorIndex].type;
								const lowAuthorText = authorText.toLowerCase();
								if(type == 'href' && href == ''){
									href = texts[authorIndex].href;
								} else if(
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
								author: author,
								href:href,
							}
							testimonials.push(testimonial)
						}
					}

					console.log(testimonials);
					resolve({
						testimonials:testimonials,
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
		testimonialsUnflattened.forEach(obj=>{
			testimonials.push(obj.testimonials);
		})

		testimonials = testimonials.flatten();
		
		let testimonialsNoDupes = [];
		testimonials.forEach(testimonial=>{ 		//Remove all duplicates within the array (whether it be same testimonial or same author)
			if(!testimonialsNoDupes.some(element => element.text === testimonial.text || element.author === testimonial.author)) {
			  testimonialsNoDupes.push(testimonial);
			}
		});

		return testimonialsNoDupes;
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
});



