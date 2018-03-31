//npm dependancies
import vision from '@google-cloud/vision';
import imagescraper from './image-scraper/image-scraper';
import google from 'google';
import striptags from 'striptags';

//Variables
//var images;
// var logosArray;

//Instantiate google vision client
const client = new vision.ImageAnnotatorClient();

//Instantiate image scraper

imagescraper.prototype.scrapeAsync = function(ms) {
    let ref = this; // same coding style as in existing methods.
    let images = [];
    return new Promise(function(resolve, reject) {
        ref.on('image', (image) => { 
        	if(images.indexOf(image.address == -1)){
        		//images.push({address:image.address, width:image.attributes.width, height:image.attributes.height});
        		images.push(image.address);
        	}
        });
        ref.on('end', () => { resolve(images) });
        // ref.on('error', reject); // unfortunately image-scraper doesn't emit an 'error' event.
        if(ms !== undefined) { // maybe timeout as substitute for error handler?
            setTimeout(function() {
                reject('image-scraper timed out after ${ms} ms');
            }, ms);
        }
        ref.scrape();
    });
}

var imageScraper = new imagescraper();

// var uniqueArray = (arrArg) => {
//   return arrArg.filter((elem, pos, arr) => {
//     return arr.indexOf(elem) == pos;
//   });
// }
google.resultsPerPage = 1;

Meteor.methods({
	async scrapeLogos(url){
		//console.log('success!');
		//Set URL for imagescraper to scrape
		imageScraper.address = url;

		const images = await imageScraper.scrapeAsync(30000);
		// let imageAddresses = [];
		let uniqueImages = Array.from(new Set(images));
		let promises = [];
		uniqueImages.forEach(image => {
		// DO NOT await here for each individual Promise, or you will chain
		// your execution instead of executing them in parallel
			promises.push(client.logoDetection(image).then(results => {
			    const logos = results[0].logoAnnotations;
			    if(logos != ''){
			    	let logosArray = [];
			    	if(logos.length > 1){
			    		let logoSet = [];
			    		logos.forEach(logo =>{
			    			if(logo.score>0.18){
			    			let keyword = logo.description.replace(/ /g,'');
			    			let logoInfo = Scrape.wikipedia(keyword, 'en');
			    			let description = striptags(logoInfo.summary);
			    			let name = logo.description;
			    			if(description == ''){
			    				description = "";
			    			}
			    			console.log(logo.description+logo.score);
			    				logoSet.push({'name':name,'description':description});
			    			}
			    		});
			    		console.log(logoSet);
			    		//@logoset: {name:...,description:...}
			    		logosArray.push({'logoset':logoSet,'src':image, 'multilogo':true});
			    	} else if(logos.length == 1) {
			    		logos.forEach(logo => {
			    			if(logo.score>0.18){
				    		//console.log(logo);
				    		let keyword = logo.description.replace(/ /g,'');
				    		//console.log(keyword);
				    		let logoInfo = Scrape.wikipedia(keyword, 'en');
				    		let description = striptags(logoInfo.summary);
				    		let name = logo.description;
				    		if(description == ''){
				    			description = "";
				    		}
				    		console.log(description);
				    			logosArray.push({'name':name,'src':image, 'description':description, 'multilogo':false});
				    		}
				    	});
			    	}
			    	return logosArray;
			    } else {
			    	return [];
			    }
			    //return (logos != '') ? logos.map(logo => {name:logo.description,address:image.address}) : [];
			}));
		});
		// Now we can await for the Promise.all.
		const resultPerImage = await Promise.all(promises);
		return resultPerImage.reduce((accumulator, imageLogosDescriptions) => {
		  return accumulator.concat(imageLogosDescriptions);
		}, []);
	},
});

