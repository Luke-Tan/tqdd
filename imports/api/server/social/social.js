/* Npm modules */
import request from 'request'
import cheerio from 'cheerio'
import Parser from 'rss-parser'
import unfluff from 'unfluff'

import {
	domainToName,
	getDomain
} from '../all/functions.js';

/*
Info:
1. Number of times mentioned on google 'xxx results from google search ' => "Number of times mentioned on the web"
2. Social shares
3. Relevant news features from newsapi
*/

function getAllIndexes(arr, val) {
    var indexes = [], i;
    for(i = 0; i < arr.length; i++)
        if (arr[i] === val)
            indexes.push(i);
    return indexes;
}

function getMentions(name,country){
	return new Promise((resolve,reject)=>{
		resolve('9000')
	})
}

function getShares(url){
	function getFacebook(url){
		return new Promise((resolve,reject)=>{
			const facebookEndPoint = `https://graph.facebook.com/?id=${url}`
			request(facebookEndPoint,(err,resp,body)=>{
				if(err){
					reject(err)
				}
				const json = JSON.parse(body);
				const facebookShares = json.share.share_count;
				resolve(facebookShares);
			})
		})
	}
	function getPinterest(url){
		return new Promise((resolve,reject)=>{
			const pinterestEndPoint = `https://api.pinterest.com/v1/urls/count.json?&url=${url}`
			request(pinterestEndPoint,(err,resp,body)=>{
				if(err){
					reject(err)
				}
				//For some reason response is in the format receiveCount({JSON}), so must remove the stuff around it
				try{
					body = body.replace(`receiveCount(`,'');
					body = body.replace(`)`,'');
					const json = JSON.parse(body);
					const pinterestShares = json.count;
					resolve(pinterestShares);
				}
				catch(error){
					reject(error);
				}
			})			
		})
	}
	function getStumbles(url){
		return new Promise((resolve,reject)=>{
			resolve(0)	
		})
	}
	return new Promise(async(resolve,reject)=>{
		let promises = [];
		promises.push(getFacebook(url).then(results=>{
			return {facebook:results}
		}))
		promises.push(getPinterest(url).then(results=>{
			return {pinterest:results}
		}))
		promises.push(getStumbles(url).then(results=>{
			return {stumbles:results}
		}))
		let shares = await Promise.all(promises);
		shares = shares.reduce((accumulator, item) => {
		  var key = Object.keys(item)[0];
		  accumulator[key] = item[key];
		  return accumulator;
		}, {});
		resolve(shares);
	})
}

function getNews(name,country,domain){
	return new Promise(async (resolve,reject)=>{
		console.log(country);
		const countryMarkers = [
			'sg',
			'singapore',
			'my',
			'malaysia'
		];
		let countryMarker;
		const nameSplit = name.split(' ');
		const nameLength = nameSplit.length;
		//const newsUrl = `https://www.google.com/search?q="${name}" ${country}&tbm=nws`
		//const newsUrl = `https://www.google.com.sg/search?tbm=nws&q="${name}"+OR+"${domain}"&lr=lang_en`
		//let googleRSSfeed = `https://news.google.com/news?q="${name}" ${country}&output=rss`

		for(let word of nameSplit){
			if(countryMarkers.includes(word.toLowerCase())){
				const index = nameSplit.indexOf(word.toLowerCase());
				countryMarker = word;
				nameSplit.splice(index, 1);
				name = nameSplit.join(' ');
				break
			}
		}

		// let firstWord;
		// let remainingWords;
		// let searchTerm;
		// if(nameLength > 1){
		// 	firstWord = nameSplit[0];
		// 	remainingWords = nameSplit.filter((item,index)=>{ return index !== 0 }).join(' ');
		// 	//Check if there is already a country inside the remaining words
		// 	for(let word of remainingWords){
		// 		if(countryMarkers.includes(word.toLowerCase)){
		// 			searchTerm = `"${firstWord}" ${remainingWords}`
		// 			break;
		// 		}
		// 	}
		// 	//If not, include the country in the search term if it is not undefined
		// 	if(country != undefined){
		// 		searchTerm = `"${firstWord}" ${remainingWords} ${country}`
		// 	} else {
		// 		searchTerm = `"${firstWord}" ${remainingWords}`
		// 	}
		// } else {
		// 	if(country != undefined){
		// 		searchTerm = `"${name}" ${country}`
		// 	} else {
		// 		searchTerm = `"${name}"`
		// 	}
			
		// }

		let searchTerm;
		if(countryMarker != undefined){
			searchTerm = `"${name}" ${countryMarker}`
		} else if(country != undefined){ 
			searchTerm = `"${name}" ${country}`
		} else {
			searchTerm = `"${name}"`
		}

		//const googleRSSfeed = `https://news.google.com/_/rss/search?q=${searchTerm}&hl=en-SG&gl=SG&ceid=SG:en`
		console.log(searchTerm); 
		const googleRSSfeed = `https://news.google.com/_/rss/search?q=${searchTerm}&hl=en-SG&gl=SG&ceid=SG:en` 
		const googleRSSfeedDomain = `https://news.google.com/_/rss/search?q="${domain}"&hl=en-SG&gl=SG&ceid=SG:en` 
		let parser = new Parser();

		//console.log(googleRSSfeed);

		const mainFeed = await parser.parseURL(googleRSSfeed);
		const domainFeed = await parser.parseURL(googleRSSfeedDomain)
		//console.log(feed.items);
		let promises = []

		mainFeed.items.forEach(async (item,index) => {
		    //console.log(item)
		    if(index < 11){
			    const title = item.title;
			    let $ = cheerio.load(item.content);
			    let thumbnail = ''
			    try{
				    thumbnail = $('img').attr('src');
				    thumbnail = thumbnail.slice(2,thumbnail.length)
			    }
			    catch(error){
			    	thumbnail = ''
			    	//console.error('No thumbnail found!')
			    }

			    const pos = getAllIndexes(title,'-').slice(-1)[0]
			    const mainTitle = title.slice(0,pos-1);
			    const publisher = title.slice(pos+2,title.length);
			    const url = item.link
			    let snippet = item.contentSnippet.replace(mainTitle,'')
			    snippet = snippet.replace(publisher,'');
			    snippet = snippet.replace(/&nbsp;/g,'');

				const articleText = new Promise((resolve,reject)=>{
					request(url,(err,resp,body)=>{
						if(err){
							reject('')
						}

						let text;
						try{
							text = unfluff(body).text;
						}
						catch(error){
							text = ''
						}

						if(text.includes(name)){
				    		let type;
				    		const regexp = new RegExp(name,'g');

					    	const count = (text.match(regexp) || []).length;
					    	//console.log(count);
					    	if(count <= 3){
					    		type='Mention'
					    	} else if(count >= 4 && count <= 7){
					    		type='Minor subject'
					    	} else if(count >= 8){
					    		type = 'Major subject'
					    	}

						    const newsObject = {
						        title:item.title,
						        snippet:snippet,
						        date:item.pubDate,
						        publisher:publisher,
						        url:url,
						        thumbnail:thumbnail,
						        count:count,
						        type:type
						    }

						    resolve(newsObject)
						} else {
							reject('');
						}
					})
				})

		    	promises.push(articleText);
			}
		});

		domainFeed.items.forEach(async (item,index) => {
		    //console.log(item)
		    if(index < 11){
			    const title = item.title;
			    let $ = cheerio.load(item.content);
			    let thumbnail = ''
			    try{
				    thumbnail = $('img').attr('src');
				    thumbnail = thumbnail.slice(2,thumbnail.length)
			    }
			    catch(error){
			    	thumbnail = ''
			    	//console.error('No thumbnail found!')
			    }

			    const pos = getAllIndexes(title,'-').slice(-1)[0]
			    const mainTitle = title.slice(0,pos-1);
			    const publisher = title.slice(pos+2,title.length);
			    const url = item.link
			    let snippet = item.contentSnippet.replace(mainTitle,'')
			    snippet = snippet.replace(publisher,'');
			    snippet = snippet.replace(/&nbsp;/g,'');

			    const articleText = new Promise((resolve,reject)=>{
				    const newsObject = {
				        title:item.title,
				        snippet:snippet,
				        date:item.pubDate,
				        publisher:publisher,
				        url:url,
				        thumbnail:thumbnail,
				        count:2,
				        type:'Mention'
				    }
			    	resolve(newsObject);
			    })

		    	promises.push(articleText);
			}
		});


		const news = await Promise.all(promises.map(p => p.catch(e => e)));
		const validNews = news.filter(result => !(result == ''));
		//console.log(validNews);
		resolve(validNews);
		 
	})
}

function getJobs(name){
	//https://www.indeed.com.sg/jobs?q=company%3A(thunderquote)
	return new Promise((resolve,reject)=>{
		//const jobUrl = `https://www.indeed.com.sg/jobs?q=${name}`
		const jobUrl = `https://www.indeed.com.sg/jobs?as_and=&as_phr=&as_any=&as_not=&as_ttl=&as_cmp=${name}&jt=all&st=&as_src=&radius=10&l=Singapore&fromage=any&limit=10&sort=&psf=advsrch`
		request(jobUrl,(err,resp,body)=>{
		    let $ = cheerio.load(body);
		    let jobs = [];
		    let jobHTML = $('.row.result');
		    $(jobHTML).each((i,e)=>{
		        let title = $(e).children('.jobtitle').text(); 
		        let table = $(e).children('table').children('tr').children('td');
		        let age = $(table).children('.result-link-bar-container').children('.result-link-bar').children('.date').text();
		        let salary = $(table).children('div').children('span.no-wrap').text();

		        /* Replace all \n and trim the remaining whitespace from the strings*/
		        age = age.replace(/\n/g,'').trim()		
		        title = title.replace(/\n/g,'').trim()
		        salary = salary.replace(/\n/g,'').trim()
		        const job = {
		            title:title,
		            salary:salary,
		            age:age
		        }
		        jobs.push(job)
		    })
		    resolve(jobs)
		})
	})
}


Meteor.methods({
	getSocial(url,domain,name,country){
		return new Promise(async (resolve,reject)=>{
			let social = {
				name:'',
				mentions: '',
				shares: '',
				news:'',
				jobs:'',
				newsFromDomain:''
			}


			//console.log(json)
			const domainName = domainToName(domain)

			// console.log(name)
			let mentions = await getMentions(name,country);
			let shares = await getShares(url);
			let news = await getNews(name,country,domain);
			//let newsFromDomain = await getNewsFromDomain(domain);
			let jobs = await getJobs(name);


			// if(news.length == 0){	//if news returns an empty array, it means news wasnt found with the domainname, try searching with name
			// 	news = await(getNews(name));
			// }

			social.name = name;
			social.mentions = mentions;
			social.shares = shares;
			social.news = news;
			social.jobs = jobs;
			//social.newsFromDomain = newsFromDomain;
			//console.log(social);
			resolve(social)
		})
	}
})