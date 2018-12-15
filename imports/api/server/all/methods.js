import request from 'request';
import Future from 'fibers/future';
import cheerio from 'cheerio';
import url from 'url';

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
			const json = JSON.parse(body);
			const result = json[0];
			if(result != undefined && result.domain == companyDomain){ //Check if the results domain is exactly the same as the domain of the company we are searching. Also checks if there is a result at all.
	    		const name = result.name;
				console.log('CLEARBIT '+name)
	    		resolve(name);
	    	} else {
	    		resolve('')
	    	}
		})
	})
}

function nameFromCopyright(url){
	const companyUrl = url;
	return new Promise((resolve,reject)=>{
		request(companyUrl,(err,resp,body)=>{
			if(err){
				reject(err);
			}

		    let $ = cheerio.load(body);
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
				console.log(copyright);
				copyright = copyright.trim()
				copyright = copyright.replace(/ +(?= )/g,''); /* Replace all multi spaces with single spaces */
				console.log(copyright);
				copyright = copyright.replace(/(\[.*?\]|\(.*?\)) */g, ""); /* Replace everything contained within brackets (usually contains bullshit)*/ 
				copyright = copyright.replace(/[-.,@$!#&]/g,' ')	  /* Replace all full stops with empty space */
				console.log(copyright);
				copyright = copyright.toLowerCase();		  /* Make the whole thing lower case so that its easy to manipulate */

				/* Add spaces behind and in front of copyrightMarker to isolate it */
				let copyrightIndex = copyright.indexOf(copyrightMarker);	
				const startIndex = copyrightIndex 
				const endIndex = copyrightIndex+(copyrightMarker.length-1)
				console.log(copyrightIndex);
				if(copyright[endIndex+1] != ' '){
					copyright = insert(copyright, copyrightIndex+1, ' ')
				}

				if(copyright[startIndex-1] != ' ' && copyright[startIndex-1] != undefined){
					copyright = insert(copyright, copyrightIndex-1, ' ')
				}

				console.log(copyright);

				copyright = copyright.split(' ');			  /* Split it into the constituent words in an array */ 
				copyright = copyright.filter(word => !(/^\d{4}$/).test(word)) /* Remove all -,@,(,),$,!,#, and years from within the array */

				console.log(copyright)

				/* Hard code in certain words that MAY be found immediately after the copyright marker that is clearly not 
				the name of the company. We remove this. First noticed in cases like '© 2018 by Clean Lab Pte Ltd' 
				Additional copyright markers may be found, e.g. © Copyright 2018. In this case, it makes sense to remove everything
				that was NOT used as the initial copyright marker
				*/
				const vetoWords = ['by','of','©','copyright','Copyright']

				if(vetoWords.includes(copyright[copyright.indexOf(copyrightMarker)+1])){
					copyright.splice(copyright.indexOf(copyrightMarker)+1, 1);
				}

				copyright = copyright.filter(word => word != '')

				/* Add the . back to .com because we removed it previously when removing all fullstops...*/
				if(copyright.indexOf('com') != -1){
					copyright.splice(copyright.indexOf('com'), 0, '.'); 
				}
				console.log(copyright);

				const start = copyright.indexOf(copyrightMarker)+1

				let end;
				const endMarkers = ['pte','all','llc','|']
				for(let item of endMarkers){
					if(copyright.includes(item)){
						end = copyright.indexOf(item)
						break
					}
				}
				if(end == undefined){
					/* If no relevant end marker is found, assume that the company has 2 words as its name */
					end = start+2;
				}

				let name = copyright.slice(start,end);
				name = name.map(word => word.charAt(0).toUpperCase() + word.slice(1));
				name = name.toString().replace(/[,]/g,' ');
				if(Boolean(name) != false){
					console.log('COPYRIGHT TO NAME '+name)
					resolve(name)
				} else {
					resolve('')								
				}
			} else {
				resolve('')
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
		let future = new Future();
		request({url:url, timeout:15000},function(err,resp,body){
			//console.log(resp.statusCode)
			if(!err && resp.statusCode ==200){
				future['return'](true);
			} else {
				console.error(err);
				if(resp != undefined){
					console.error(resp.statusCode);
				}
				future['return'](false);
			}
		});
		return future.wait();
	},
	getUrls(url,bareUrl){
		if(url.slice(0, -1) != '/'){
			url += '/';
		}
		let future = new Future();
		request(url,function(err,resp,body){
			if(err){
				future["return"]('error');
			} else {
				$ = cheerio.load(body);
				let links = $('a');
				let linksArray = [];
				$(links).each(function(i, link){
					let href = $(link).attr('href');
					if(href !== undefined){
						if(href.charAt(0)=='/'){
							href = url.slice(0, -1)+href;
						}
						if(href.includes(bareUrl)){
							if(!linksArray.includes(href)){
								linksArray.push(href);
							}
						}
					}
				});
				future["return"](linksArray);
			}
		});
		return future.wait();
	},
	getName(url,domain){
		// 1. Clearbit
		// 2. Copyright
		// 3. URL
		return new Promise(async (resolve,reject)=>{
			let name = await nameFromClearbit(domain);
			if(name == ''){
				name = await nameFromCopyright(url)
			}
			if(name == ''){
				name = await nameFromDomain(domain);
			}
			resolve(name);
		})
	}
});

