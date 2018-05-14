//npm dependancies
import vision from '@google-cloud/vision';
import striptags from 'striptags';
import request from 'request';
import cheerio from 'cheerio';
import KGSearch from 'google-kgsearch';
import url from 'url';

//Global constants
const logoThreshold = 0.5;
const blurbThreshold = 30;

//Instantiate Google Vision Client
const client = new vision.ImageAnnotatorClient({
	projectId: Meteor.settings.PROJECT_ID,
	credentials: {
		private_key: Meteor.settings.private_key.replace(/\\n/g, '\n'),
		client_email: Meteor.settings.client_email
	}
});

//Instantiate Google Knowledge Graph Search
const kGraph = KGSearch(Meteor.settings.GOOGLE_API_KEY);


//Functions for loading and preparing of images in base64 buffer to send to google cloud API
function loadAsync(image){
    return new Promise(function(resolve,reject){
    	//console.log(image);
    	if(!image.includes('base64')){
		    request({url: image, encoding: null}, function (err, res, body) {
		        if (!err && res.statusCode == 200) {
		            let image = body.toString('base64');
		            let buf = Buffer.from(image, 'base64');
		            resolve(buf);
		        } else {
		            reject(err);
		        }
		    });
		} else {
			let buf = Buffer.from(image, 'base64');
			resolve(buf);
		}     
    });
}

async function getImagesAsBase64(images){
	let promises = [];
	images.forEach(image =>{
		promises.push(loadAsync(image).then(results =>{
			return {'src':image,'data':results};
		}).catch(err=>{
			return undefined;
		}));
	});
	const imagesAsBase64 = await Promise.all(promises);
	return imagesAsBase64;
}

function loadImages(address){
    return new Promise(function(resolve,reject){
		request(address,function(err,resp,body){
			let imgsArray = [];
			if(err){
				reject(err);
			}
			$ = cheerio.load(body);
			var imgs = $('img');
			$(imgs).each(function(i,img){

				let src = img.attribs.src;

				if(src == undefined){
					//console.log(img.attribs);
					let srcBreak = false;
					Object.entries(img.attribs).forEach(
					    ([key, value]) => {
							if(key.includes('src') || key.includes('data')){ //Look for possible src or data attributes to find img URL
								if(srcBreak == false){
									src = img.attribs[key];
									//Artificially break loop when first instance of 'src' or 'data' is found
									srcBreak = true;
									//console.log(src);
								}
					        }
						}
					);				
				}

				/*

				INCLUDE CHECK TO OBTAIN FIRST URL IF SRC IS A SRCSET!!!

				*/

				//If src is still undefined, do NOT attempt to resolve
				if(src != undefined){
					let imgAddress = url.resolve(address, src);
					imgsArray.push(imgAddress);
				}

			})
			resolve(imgsArray);
		});       
    });	
}

async function getImages(url){
	let images = await loadImages(url);
	return images;
}

function getDescription(params){
	return new Promise(function(resolve,reject){
		kGraph.search(params, (err, items) => {
			if(err){
				reject(err);
			} else {
				let content = '';
				items.forEach((item,index)=>{
					//console.log(item);
					let score = item.resultScore;
					//console.log('hi');
					if(item.result.detailedDescription != undefined && score > blurbThreshold){
						content += item.result.detailedDescription.articleBody;
					}
					//console.log(content);
					//console.log(typeof(content));
				});
				resolve(content);
			}
		})
	});
}

async function getDescriptionAsync(params){
	const content = await getDescription(params).then(results=>{
		return results;
	});
	return content;
}

//google.resultsPerPage = 1;

//Methods to be called by client to scrape for images
Meteor.methods({
	async scrapeLogos(url){
		//Set URL for imagescraper to scrape
		//imageScraper.address = url;

		//const images = await imageScraper.scrapeAsync(50000);
		const images = await getImages(url);
		let uniqueImages = Array.from(new Set(images));
		//console.log(uniqueImages);
		let uniqueImagesBase64 = await getImagesAsBase64(uniqueImages);
		//console.log(uniqueImagesBase64);

		let promises = [];

		uniqueImagesBase64.forEach(image => {
			// DO NOT await here for each individual Promise, or you will chain
			// your execution instead of executing them in parallel
			//console.log(image);
			if(image != undefined){
				promises.push(client.logoDetection(image.data).then(results => {
				    const logos = results[0].logoAnnotations;
				    if(logos != ''){
				    	let logosArray = [];
				    	if(logos.length > 1){
				    		let logoSet = [];
				    		logos.forEach(logo =>{
				    			console.log(logo.score+ logo.description);
				    			if(logo.score>logoThreshold){
				    				let name = logo.description;
									let params = {
									  query: name,
									  types: 'Organization',
									  limit: 1
									}
									let description = getDescriptionAsync(params).await();
					    			// let keyword = logo.description.replace(/ /g,'');
					    			// let logoInfo = Scrape.wikipedia(keyword, 'en');
					    			// let description = striptags(logoInfo.summary);
					    			if(description == ''){
					    				description = "";
					    			}
					    			//console.log(logo.description+logo.score);
					    			logoSet.push({'name':name,'description':description});
				    			}
				    		});
									    		
									    	/* @logoset: {name:...,description:...} */

				    		logosArray.push({'logoset':logoSet,'src':image.src, 'multilogo':true});
				    	} else if(logos.length == 1) {
				    		logos.forEach(logo => {
				    			//console.log(logo.score+logo.description)
				    			if(logo.score>logoThreshold){
				    				let name = logo.description;
									let params = {
									  query: name,
									  types: 'Organization',
									  limit: 1
									}
									let description = getDescriptionAsync(params).await();

					    			// let keyword = logo.description.replace(/ /g,'');
					    			// let logoInfo = Scrape.wikipedia(keyword, 'en');
					    			// let description = striptags(logoInfo.summary);
					    			if(description == ''){
					    				description = "";
					    			}
						    		logosArray.push({'name':name,'src':image.src, 'description':description, 'multilogo':false});
					    		}
					    	});
				    	}
				    	return logosArray;
				    } else {
				    	return [];
				    }
				}).catch(err=>{
					return [];
				}));
			}
		});
		// Now we can await for the Promise.all.
		const resultPerImage = await Promise.all(promises);
		return resultPerImage.reduce((accumulator, imageLogosDescriptions) => {
		  return accumulator.concat(imageLogosDescriptions);
		}, []);
	},
});

