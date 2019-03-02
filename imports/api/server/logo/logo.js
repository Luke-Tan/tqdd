//npm dependancies
import vision from '@google-cloud/vision';
import request from 'request';
import cheerio from 'cheerio';
import KGSearch from 'google-kgsearch';
import nodeUrl from 'url';

/* Global constants */ 
const logoThreshold = 0.4;		// Confidence threshold to accept/reject a logo from Google Vision
const blurbThreshold = 50;		// Confidence threshold to accept/reject a blurb from Google Knowledge Graph

/* Instantiate Google Vision Client */
const client = new vision.ImageAnnotatorClient({
	projectId: Meteor.settings.PROJECT_ID,
	credentials: {
		private_key: Meteor.settings.private_key.replace(/\\n/g, '\n'),
		client_email: Meteor.settings.client_email
	}
});

/* Instantiate Google Knowledge Graph */
const kGraph = KGSearch(Meteor.settings.GOOGLE_API_KEY);


/* Functions for loading and preparing of images in base64 buffer to send to google cloud API */
function srcToBuffer(image){
    return new Promise(function(resolve,reject){
    	if(!image.includes('base64')){
		    request({url: image, encoding: null}, function (err, res, body) {
		        if (!err && res.statusCode == 200) {
		            let image = body.toString('base64');
		            let buffer = Buffer.from(image, 'base64');
		            resolve(buffer);
		        } else {
		            reject(err);
		        }
		    });
		} else {
			let buffer = Buffer.from(image, 'base64');
			resolve(buffer);
		}     
    });
}

async function getImagesAsBase64(images){
	let promises = [];
	images.forEach(image =>{
		promises.push(srcToBuffer(image).then(results =>{
			return {'src':image,'data':results};
		}).catch(err=>{
			console.error(err);
			return undefined;
		}));
	});
	const imagesAsBase64 = await Promise.all(promises);
	return imagesAsBase64;
}

async function loadImages(urls){
	let promises = [];
	//console.log(urls);
	urls.forEach(url=>{
		let imagesFromUrl = new Promise((resolve,reject)=>{
			request(url,function(err,resp,body){
				let imgsArray = [];
				if(err){
					reject(err);
				}
				$ = cheerio.load(body);
				var imgs = $('img');
				$(imgs).each(function(i,img){
					let src = img.attribs.src;
					let width = (img.attribs.width);
					let height = (img.attribs.height);
					if(width != undefined){
						width = width.replace('px','');
					}
					if(height != undefined){
						height = height.replace('px','');
					}
					if(src == undefined){
						//console.log(img.attribs);
						let srcBreak = false;
						Object.entries(img.attribs).forEach(
						    ([key, value]) => {
								if(key.includes('src') || key.includes('data')){ //Look for possible src or data attributes to find img URL
									if(srcBreak == false){
										src = img.attribs[key];
										srcBreak = true; //Artificially break loop when first instance of 'src' or 'data' is found
										//console.log(src);
									}
						        }
							}
						);				
					}
					//If src is still undefined, do NOT attempt to resolve
					if(src != undefined){
						try{
							//Ignore images that are too small as these probably aren't logos. Include images that have no defined width or height
							if( (width == undefined || height == undefined) || (width > 30 && height > 30) ){
								let imgAddress = nodeUrl.resolve(url, src);
								imgsArray.push(imgAddress);
							}
						}
						catch(error){
							console.error(error);
						}
					}
				})
				resolve(imgsArray);
			});  
		})  
		promises.push(imagesFromUrl);   
	})

	//Flatten to a single array with depth = 1
	const allImages = await Promise.all(promises).then((result)=>{return result}).catch((err)=>{return []});
	const allImagesFlattened = [].concat.apply([], allImages);
	return allImagesFlattened;
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
				});
				resolve(content);
			}
		})
	});
}

function removeDuplicates(originalArray, prop) {
     var newArray = [];
     var lookupObject  = {};

     for(var i in originalArray) {
        lookupObject[originalArray[i][prop]] = originalArray[i];
     }

     for(i in lookupObject) {
         newArray.push(lookupObject[i]);
     }
      return newArray;
}

/* Methods to be called by client to scrape for images */
Meteor.methods({
	async scrapeLogos(mainUrl, urls){
		// let clientUrls = urls.filter(url => {url.includes('client') || url.includes('portfolio')});;
		let clientUrls= urls.filter(url => {
		    if (url.includes('client') || url.includes('portfolio')){
		    	return true;
		    } else {
		    	return false
		    }
		});
		clientUrls.push(mainUrl);
		//const images = await loadImages(clientUrls);
		const images = await loadImages([mainUrl]);
		let uniqueImages = Array.from(new Set(images));
		let uniqueImagesBase64 = await getImagesAsBase64(uniqueImages);
		console.log(uniqueImagesBase64.length)
		let promises = [];

		uniqueImagesBase64.forEach(image => {
			// DO NOT await here for each individual Promise, or you will chain
			// your execution instead of executing them in parallel
			if(image != undefined){
				promises.push(client.logoDetection(image.data).then(results => {
				    const logos = results[0].logoAnnotations;
				    if(logos != ''){
				    	let logosArray = [];
				    	if(logos.length > 1){
				    		let logoSet = [];
				    		logos.forEach(logo =>{
				    			if(logo.score>logoThreshold){
					    			let name = logo.description;
									let params = {
									  query: name,
									  types: 'Organization',
									  limit: 1
									}
									let description = getDescription(params).await();
									logoSet.push({'name':name,'description':description,'score':logo.score});
				    			}
				    		});
									    		
							/* @logoset: {name:...,description:...} */
				    		logosArray.push({'logoset':logoSet,'src':image.src, 'multilogo':true});
				    	} else if(logos.length == 1) {
				    		logos.forEach(logo => {
				    			if(logo.score>logoThreshold){
				    				let name = logo.description;
									let params = {
									  query: name,
									  types: 'Organization',
									  limit: 1
									}
									let description = getDescription(params).await();
					    			if(description == ''){
					    				description = "";
					    			}
				    				logosArray.push({'name':name,'src':image.src, 'description':description, 'multilogo':false, 'score':logo.score});
					    		}
					    	});
				    	}
				    	return logosArray;
				    } else {
				    	return [];
				    }
				}).catch(err=>{
					console.error(err);
					return [];
				}));
			}
		});
		// Now we can await for the Promise.all.
		const resultPerImage = await Promise.all(promises);
		const reducedLogos = resultPerImage.reduce((accumulator, imageLogosDescriptions) => {
		  return accumulator.concat(imageLogosDescriptions);
		}, []);
		const imagesNoDupes = removeDuplicates(reducedLogos,'src');
		return imagesNoDupes;
	},
});
