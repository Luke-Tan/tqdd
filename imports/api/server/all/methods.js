import request from 'request';
import Future from 'fibers/future';
import cheerio from 'cheerio';
import url from 'url';

import {
	getName 
} from './functions.js'

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
	getNameAndLogo(url,domain){
		// 1. Clearbit
		// 2. Copyright
		// 3. URL
		let nameAndLogo = {
			name:'',
			logo:''
		}
		const companyDomain = domain;
		const companyUrl = url;
		const clearbitAPIendpoint = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${companyDomain}`;
		return new Promise((resolve,reject)=>{
			request(clearbitAPIendpoint,(err,resp,body)=>{
				const json = JSON.parse(body);
				if(err){
					reject(err)
				}
			    if(json[0] != undefined){
			    	const name = (json[0]).name;
			    	const logo = (json[0]).logo;
			    	nameAndLogo = {
			    		name:name,
			    		logo:logo
			    	}
			    	resolve(nameAndLogo);
				} else {
					request(companyUrl,(err,resp,body)=>{
						if(err){
							reject(err);
						}
					    //console.log(body)
					    //console.log(err)
					    console.log(body)
					    let $ = cheerio.load(body);
					    let copyright = '';

						$('*').not('script').each((index,element)=>{	// Scan ALL elements, barring in-line scripts, for potential text
							let text;
							if($(element).children().length > 0){		// If the element has children, only get the text of the element itself
								text = $(element).first().contents().filter(function() {
								    return this.type === 'text';
								}).text().trim();	
							} else {
								text = $(element).text().trim();		// Get text of the element
							} 
							// if(!text.includes('\\') && !text.includes('{') && !text.includes('}') && !text.includes('<') && !text.includes('>')){ // Immediately reject blocks of texts that include unusual characters (usually signifies that the text contains code, making the text irrelevant)*/
							// 	texts.push({'text':text});
							// }
							if(text.includes('©')){
								if(text.slice(-1) == '©'){
									const next = $(element).next().text().trim()
									const child = $(element).children().first().text().trim()
									copyright += `${text} ${next} ${child}`
								} else {
									copyright += text;
								}
							}
						});

						if(copyright != ''){
							copyright = copyright.trim()
							copyright = copyright.replace(/ +(?= )/g,''); /* Replace all multi spaces with single spaces */
							copyright = copyright.replace(/[.]/g,'')	  /* Replace all full stops with empty space */
							copyright = copyright.toLowerCase();		  /* Make the whole thing lower case so that its easy to manipulate */
							copyright = copyright.split(' ');			  /* Split it into the constituent words in an array */ 
							copyright = copyright.filter(word => !word.includes('-') && !(/^\d{4}$/).test(word)) /* Remove all hyphens and years from within the array */
							const start = copyright.indexOf('©')+1
							let end;
							if(copyright.includes('pte')){
								end = copyright.indexOf('pte')
							} else if(copyright.includes('all')){
								end = copyright.indexOf('all');
							} else if(copyright.includes('llc')){
								end = copyright.indexOf('llc')
							} else if(copyright.includes()){

							} else {
								end = start+2	/* If no relevant end marker is found, assume that the company has 2 words as its name */
							}
							let name = copyright.slice(start,end);
							name = name.map(word => word.charAt(0).toUpperCase() + word.slice(1));
							name = name.toString().replace(/[,]/g,' ');
							nameAndLogo = {
								name:name,
								logo:''
							}
							resolve(nameAndLogo)
						} else {
							name = getName(companyDomain)
							nameAndLogo = {
								name:name,
								logo:''
							}
							resolve(nameAndLogo)
						}
					});
				}
			});
		})
	}
});

