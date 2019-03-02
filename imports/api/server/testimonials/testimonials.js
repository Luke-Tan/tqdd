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

/* Testimonial functions */
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
async function authorScore(arr){
	//First we join the array into a single string
	const textString = arr.join(' ');
	/* Get the indexes of each element in the array with respect to the string, 
	*  so we can map each score from the string to its respective element in the initial array
	*/
	let indexes = [];
	for(item of arr){
		let endIndex = [...arr.slice(0,arr.indexOf(item)+1)].reduce((a, b) => a + b.length, 0);
		indexes.push(endIndex);
	}
	const result = await pd.ner(textString)
	    .then((response) => {
	    	let score_array = []
	    	/* Goal is to make array look like this [0,0,0,...], depending on how many author strings we need to analayse, 
	    	*  so that we can easily add to these scores later 
	    	*/
	    	for(item of arr){
	    		score_array.push(0);
	    	}
	        const entities = (JSON.parse(response)).entities;
	        let score = 0;
	        entities.forEach(entity => {
	        	const name = entity.name;
	        	const category = entity.category;
	        	const confidence = entity.confidence_score
	        	//Find the index of the scored entity within the overall string
	        	const index = textString.indexOf(name);
	        	/* Check through the indexes that we mapped out earlier.
				 * when theindex falls within the range of one of these indexes,
				 * we can then add to the appropriate index within the score_array
				 * Break when its found 
				 * NOTE: this will FAIL if the scored entity appears multiple times within the text across different indexes
				 * All of the scores will pile up on the earliest index. This is a minor fail (still can work afterwards).
				 */
	        	for(i of indexes){
	        		if(index<=i){
			        	if(category == 'name'){
			        		score_array[indexes.indexOf(i)] += 3*confidence
			        	}
			        	if(category == 'organization'){
			        		score_array[indexes.indexOf(i)] += 1*confidence
			        	}
			        	if(category == 'group'){
			        		score_array[indexes.indexOf(i)] += 1*confidence
			        	}
			        	break;
	        		}
	        	}

	        });
	        console.log(score_array)
	        return score_array;
	    })
	    .catch((error) => {
	        return [];
    })
	return result;
}
function isTestimonial(text,classifier){
	if(wordCount(text) > 4 && classifier.classify(text)=='testimonial'){ // A valid testimonial should have at least 5 words
		const classifications = classifier.getClassifications(text);
		const testimonialScore = classifications[0].value;
		const plainScore = classifications[1].value;
		const factor = testimonialScore/plainScore;
		/* Filter out junk testimonials by comparing the testimonial confidence score to the plain confidence score
		 * Valid ones usually have a large factor difference
		 */
		if(factor > 50){
			return true;
		} else {
			return false;
		}
	} else {
		return false;
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
	const testimonials = await Promise.all(promises)
		.then(result=>{
			return result;
		})
		.catch(error=>{
			console.error(error);
			return [];
		});
	return testimonials;
}
function classifyTestimonials(link){
	return new Promise((resolve,reject)=>{
		request(link,async (err,resp,body)=>{
			if(err){
				reject(err);
				return;
			}
			if(!err && resp.statusCode == 200){
				natural.LogisticRegressionClassifier.load(Assets.absoluteFilePath('logistic_classifier_5.json'), null, async function(err, classifier) {
					let $ = cheerio.load(body);
					let texts = [];
					let testimonials = [];
					//Replace breaks within the body with a blank space
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
						// If the element has children, only get the text of the element itself
						if($(element).children().length > 0){		
							text = $(element).first().contents().filter(function() {
							    return this.type === 'text';
							}).text().trim();	
						} else {
							text = $(element).text().trim();		// Get text of the element
						} 
						/* Immediately reject texts that are empty, purely whitespace, or include unusual characters that usually signify code*/
						if(text != '' && text.replace(/\s/g, '').length && !text.includes('\\') && !text.includes('{') && !text.includes('}') && !text.includes('<') && !text.includes('>') ){ 
							if(isTestimonial(text,classifier)){
								//String together testimonial
								testimonialText += text
							} else {
								//When non-testimonial is encountered, consider the testimonial complete and push to array
								if(testimonialText != ''){
									texts.push({'text':testimonialText,type:'testimonial'})
									testimonialText = '';
								}
								/* If there is a link immediately after the testimonial, we can assume it is a useful link
								 * that usually contains additional information about the testimonial. Add it to the text array.
								 */
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

					const testimonialIndexes = getAllIndexes(texts,'testimonial');
					if(testimonialIndexes.length == 0){
						resolve({testimonials:[]});
						return;
					}

					let { maxDistance , minDistance } = getDistances(testimonialIndexes);

					let firstTestimonialIndex = Math.min(...testimonialIndexes);
					let lastTestimonialIndex = Math.max(...testimonialIndexes);

					let min = firstTestimonialIndex-maxDistance;

					if(min < 0){
						min = 0;
						maxDistance = firstTestimonialIndex-min;
						if(minDistance>maxDistance){
							minDistance = maxDistance;
						}
					}
					let max = lastTestimonialIndex+maxDistance;
						if(max > texts.length-1){
							max = texts.length-1
							maxDistance = max-lastTestimonialIndex;
							if(minDistance > maxDistance){
								minDistance = maxDistance;
						}
					}

					const start = firstTestimonialIndex-maxDistance;
					const end = lastTestimonialIndex+maxDistance;

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

					let authorBeforeTestimonialScores;
					let authorAfterTestimonialScores;

					console.log(authorBeforeTestimonialTexts);
					console.log(authorAfterTestimonialTexts);
					try{
						authorBeforeTestimonialScores = await authorScore(authorBeforeTestimonialTexts);
						authorAfterTestimonialScores = await authorScore(authorAfterTestimonialTexts);
					}
					catch(error){
						authorBeforeTestimonialScores = 0;
						authorAfterTestimonialScores = 0;
					}

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
									//Hard code in words that usually appear near testimonials but are definitely not authors
									!lowAuthorText.includes('thank') && 
									!lowAuthorText.includes('regard') && 
									!lowAuthorText.includes('forward') && 
									!lowAuthorText.includes('wish') &&
									!lowAuthorText.includes('more') &&
									!lowAuthorText.includes('testimonial') &&
									!lowAuthorText.includes('want') &&
									!lowAuthorText.includes('sign up') &&
									wordCount(lowAuthorText) < 20 && //Hard limit of 20 words for an author
									authorCounter < minDistance &&
									lowAuthorText.length>2
								) {
									authorCounter++;
									//Use pipe character as a seperator
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
									!lowAuthorText.includes('thank') && 
									!lowAuthorText.includes('regard') && 
									!lowAuthorText.includes('forward') && 
									!lowAuthorText.includes('wish') &&
									!lowAuthorText.includes('more') &&
									!lowAuthorText.includes('testimonial') &&
									!lowAuthorText.includes('want') &&
									!lowAuthorText.includes('sign up') &&
									wordCount(lowAuthorText) < 20 && 
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
						const link = nodeurl.resolve(url,href);
						/*	Consider all links that contain the word 'testimonial' inside is a valid link with testimonials
						 *	Reject links that contain a '#'' as it just points to the home page and we dont want to make excess queries
						 *	Reject links that are already inside the array in case there are multiple links pointing to the same url 
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

		let testimonialsUnflattened; 
		try{
			testimonialsUnflattened = await getTestimonials(testimonialLinks)
		}
		catch(error){
			testimonialsUnflattened = [];
		}
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



