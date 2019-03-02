import request from 'request';
import { filter } from 'fuzzaldrin';
import cheerio from 'cheerio';
import nodeUrl from 'url';

import {
	domainToName 
} from './functions.js'

function insert(str, index, value) {
    return str.substr(0, index) + value + str.substr(index);
}

function nameFromClearbit(domain){
	const companyDomain = domain;
	const clearbitAPIendpoint = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${companyDomain}`;
	return new Promise((resolve,reject)=>{
		request(clearbitAPIendpoint,(err,resp,body)=>{
			if(err){
				reject(err)
			}
			let json;
			let result;
			try{
				json = JSON.parse(body);
				result = json[0];
			} 
			catch(error){
				resolve('');
				return
			}
			if(result != undefined && result.domain == companyDomain){ //Check if the results domain is exactly the same as the domain of the company we are searching. Also checks if there is a result at all.
	    		const name = result.name;
				('CLEARBIT '+name)
	    		resolve(name);
	    	} else {
	    		resolve('')
	    	}
		})
	})
}

function nameFromWebsite(url,domainName){
	const companyUrl = url;
	return new Promise((resolve,reject)=>{
		request(companyUrl,(err,resp,body)=>{
			if(err){
				reject(err);
				return;
			}
			/*  
				Name from website looks for the company name in 2 possible locations 
				1. The <title> tag
				2. A copyright line from the website
			*/

		    let $ = cheerio.load(body);

		    const title = $('title').text();
		    const candidates = title.split(/[:|-]+/).map(term=>term.trim());
		    console.error(candidates);
		    const results = filter(candidates, domainName);
		    console.error(domainName);

		    //Ensure that the resultant name and domainName are somewhat similar in length, since the fuzzy filter does not care for length.
		    if(results.length != 0 && results[0].length-10 < domainName.length){
		    	const name = results[0];
		    	resolve(name);
		    	return;
		    } else {
				let copyright = '';
			    let copyrightMarker = ''

				$('*').not('script,style').each((index,element)=>{	// Scan ALL elements, barring in-line scripts, for potential text
					let text;
					if($(element).children().length > 0){		// If the element has children, only get the text of the element itself
						text = $(element).first().contents().filter(function() {
						    return this.type === 'text';
						}).text().trim();	
					} else {
						text = $(element).text().trim();		// Get text of the element
					} 
					//Check for possible copyright markers on the website, e.g. copyright, Copyright, (c), (C)
					const copyrightMarkers = ['©','copyright','Copyright','(c)','(C)'];
					for (let item of copyrightMarkers) {
						if(text.includes(item)){
							copyrightMarker = item
							if(text.slice(-1) == copyrightMarker){
								const next = $(element).next().text().trim()
								const child = $(element).children().first().text().trim()
								copyright += `${text} ${next} ${child}`
							} else {
								copyright += text;
							}
							break;
						}
					}
				});

				if(copyright != ''){
					copyright = copyright.trim()
					copyright = copyright.replace(/ +(?= )/g,''); /* Replace all multi spaces with single spaces */
					copyright = copyright.replace(/(\[.*?\]|\(.*?\)) */g, ""); /* Replace everything contained within brackets (usually contains bullshit)*/ 
					copyright = copyright.replace(/[-.,@$!#&]/g,' ')	  /* Replace all full stops with empty space */
					copyright = copyright.toLowerCase();		  /* Make the whole thing lower case so that its easy to manipulate */

					/* Add spaces behind and in front of copyrightMarker to isolate it */
					let copyrightIndex = copyright.indexOf(copyrightMarker);	
					const startIndex = copyrightIndex 
					const endIndex = copyrightIndex+(copyrightMarker.length-1)
					if(copyright[endIndex+1] != ' '){
						copyright = insert(copyright, copyrightIndex+1, ' ')
					}

					if(copyright[startIndex-1] != ' ' && copyright[startIndex-1] != undefined){
						copyright = insert(copyright, copyrightIndex-1, ' ')
					}


					copyright = copyright.split(' ');			  /* Split it into the constituent words in an array */ 
					copyright = copyright.filter(word => !(/^\d{4}$/).test(word)) /* Remove all -,@,(,),$,!,#, and years from within the array */


					/* Hard code in certain words that MAY be found immediately after the copyright marker that is clearly not 
					the name of the company. We remove this. First noticed in cases like '© 2018 by Clean Lab Pte Ltd' 
					Additional copyright markers may be found, e.g. © Copyright 2018. In this case, it makes sense to remove everything
					that was NOT used as the initial copyright marker
					*/
					const vetoWords = ['by','of','©','copyright','Copyright','powered','made',]
					console.log(copyright);
					let maxCount = 4
					for(let i = 1; i < maxCount; i++){
						const indexOfWordToCheck = copyright.indexOf(copyrightMarker)+i
						const wordToCheck = copyright[indexOfWordToCheck]
						console.error(wordToCheck);
						if(vetoWords.includes(wordToCheck)){
							copyright.splice(indexOfWordToCheck, 1);
							i--;
							maxCount--;
						}
					}

					copyright = copyright.filter(word => word != '')

					/* Add the . back to .com because we removed it previously when removing all fullstops...*/
					if(copyright.indexOf('com') != -1){
						copyright.splice(copyright.indexOf('com'), 0, '.'); 
					}

					let start = copyright.indexOf(copyrightMarker)+1

					let end;
					const endMarkers = ['llp','pte','all','llc','|','-'];

					for(let word of copyright){
						if(endMarkers.includes(word)){
							end = copyright.indexOf(word);
							break;
						}
					}

					if(start >= end){
						end = start-1;
						if(end > 3){
							resolve('');
						} else {
							start = 0;
							let name = copyright.slice(start,end);
							name = name.map(word => word.charAt(0).toUpperCase() + word.slice(1));
							name = name.toString().replace(/[,]/g,' ');
							if(Boolean(name) != false){
								('COPYRIGHT TO NAME '+name)
								resolve(name)
								return
							} else {
								resolve('')		
								return						
							}
						}
					}
					if(end == undefined){
						/* If no relevant end marker is found, assume that the company has 2 words in its name */
						end = start+2;
					}

					let name = copyright.slice(start,end);
					name = name.map(word => word.charAt(0).toUpperCase() + word.slice(1));
					name = name.toString().replace(/[,]/g,' ');
					if(Boolean(name) != false){
						resolve(name)
						return
					} else {
						resolve('')		
						return						
					}
				} else {
					resolve('')
					return
				}

		    }
		});
	})
}

function nameFromDomain(domain){
	let name = domainToName(domain)
	name = name.charAt(0).toUpperCase() + name.slice(1); //Caps the first letter from the name since its a name!
	return name;
}

Meteor.methods({
	checkForValidUrl(url){
		return new Promise((resolve,reject)=>{
			request({url:url, timeout:15000},function(err,resp,body){
			//(resp.statusCode)
				if(!err && resp.statusCode ==200){
					resolve({status:true,body:body})
				} else {
					console.error(err);
					if(resp != undefined){
						console.error(resp.statusCode);
					}
					resolve({status:false,body:''})
				}
			});
		})
	},
	getUrls(url){
		return new Promise((resolve,reject)=>{
			request(url,function(err,resp,body){
				if(err){
					reject(err);
				} else {
					$ = cheerio.load(body);
					let urls = [];
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
							const link = nodeUrl.resolve(url,href);
							/* 
								Reject urls that contain a '#'' as it just points to the home page and we dont want to make excess queries
							*/
							if(
								!(hrefLowerCase.includes('#')) && 
								!(urls.includes(link))
							) {
								urls.push(link);
							}
						}
					});
					resolve(urls);
				}
			})
		});
	},
	getName(url,domain){
		/* 1. Clearbit
		 * 2. Website (1.Title 2.Copyright)
		 * 3. URL
		*/
		const domainName = nameFromDomain(domain);
		return new Promise(async (resolve,reject)=>{
			let name = await nameFromClearbit(domain).catch((err=>{
				console.error(err);
				return ''
			}));
			if(name == ''){
				name = await nameFromWebsite(url,domainName).catch((err=>{
					console.error(err);
					return ''
				}));
			}
			if(name == ''){
				name = domainName;
			}
			resolve(name);
		})
	}
});

