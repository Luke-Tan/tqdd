//npm dependancies
import vision from '@google-cloud/vision';
import imagescraper from './image-scraper/image-scraper';
import google from 'google';
import striptags from 'striptags';
import request from 'request';
import rp from 'request-promise';
import cheerio from 'cheerio';
import KGSearch from 'google-kgsearch';
import url from 'url';


//Variables

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


//Instantiate image scraper
var imageScraper = new imagescraper();

//Functions for loading and preparing of images in base64 buffer to send to google cloud API
function loadAsync(image){
    return new Promise(function(resolve,reject){
    	if(!image.includes('base64')){
		    request({url: image, encoding: null}, function (err, res, body) {
		        if (!err && res.statusCode == 200) {
		            let image = body.toString('base64');
		            let buf = Buffer.from(image, 'base64');
		            resolve(buf)
		        } else {
		            return reject(err);
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
				return reject(err);
			}
			$ = cheerio.load(body);
			var imgs = $('img');
			$(imgs).each(function(i,img){
				//console.log(img);
				let src = img.attribs.src;
				if(src == undefined){
					src = img.attribs['data-cfsrc'];
				}
				let imgAddress = url.resolve(address, src);
				//console.log(imgAddress);
				imgsArray.push(imgAddress);
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
					if(item.result.detailedDescription != undefined && score > 10){
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
		imageScraper.address = url;

		//const images = await imageScraper.scrapeAsync(50000);
		const images = await getImages(url);
		console.log(images);
		let uniqueImages = Array.from(new Set(images));
		let uniqueImagesBase64 = await getImagesAsBase64(uniqueImages);

		let promises = [];

		uniqueImagesBase64.forEach(image => {
			// DO NOT await here for each individual Promise, or you will chain
			// your execution instead of executing them in parallel
			promises.push(client.logoDetection(image.data).then(results => {
			    const logos = results[0].logoAnnotations;
			    //console.log(logos);
			    if(logos != ''){
			    	let logosArray = [];
			    	if(logos.length > 1){
			    		let logoSet = [];
			    		logos.forEach(logo =>{
			    			console.log(logo.score+'logo.description');
			    			if(logo.score>0.22){
			    				let name = logo.description;
								let params = {
								  query: name,
								  types: 'Organization',
								  limit: 1
								}
								let description = getDescriptionAsync(params);
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
			    		//@logoset: {name:...,description:...}
			    		logosArray.push({'logoset':logoSet,'src':image.src, 'multilogo':true});
			    	} else if(logos.length == 1) {
			    		logos.forEach(logo => {
			    			console.log(logo.score+logo.description)
			    			if(logo.score>0.22){
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
			}));
		});
		// Now we can await for the Promise.all.
		const resultPerImage = await Promise.all(promises);
		return resultPerImage.reduce((accumulator, imageLogosDescriptions) => {
		  return accumulator.concat(imageLogosDescriptions);
		}, []);
	},
});

