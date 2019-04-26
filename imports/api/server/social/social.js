/* Npm modules */
import request from 'request'
import cheerio from 'cheerio'
import Parser from 'rss-parser'
import unfluff from 'unfluff'

import {
	domainToName,
	getDomain,
	getAllIndexes
} from '../all/functions.js';

function getShares(url){
	function getFacebook(url){
		return new Promise((resolve,reject)=>{
			const fb_app_key = `432210520940209|vCo4VaazsuAIcnQjj-KfA38djUY`
			// const facebookEndPoint = `https://graph.facebook.com/?id=${url}`
			const facebookEndPoint = `https://graph.facebook.com/v2.2/?id=${url}&fields=og_object{engagement}&access_token=${fb_app_key}`
			request(facebookEndPoint,(err,resp,body)=>{
				if(err){
					reject(err)
				}
				try{
					const json = JSON.parse(body);
					// const facebookShares = json.share.share_count;
					const facebookShares = json.og_object.engagement.count;
					resolve(facebookShares)					
				}
				catch(err){
					console.error(err);
					resolve(0);
				}
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
		promises.push(getFacebook(url)
			.then(results=>{
				return {facebook:results}
			})
			.catch(error=>{
				console.error(error);
				return {facebook:0}
			})
		)
		promises.push(getPinterest(url)
			.then(results=>{
				return {pinterest:results}
			})
			.catch(error=>{
				console.error(error);
				return {pinterest:0}
			})
		)
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
		//name = name.replace(/[^\x00-\x7F]+/g,''); // Remove all non unicode characters (stuff like chinese, japanese) so that we don't get a bad search
		name = name.replace(/’/g,`'`)			  // Replace known weird characters with similar ones that are used more often
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

		let searchTerm;
		if(countryMarker != undefined){
			searchTerm = `"${name}" ${countryMarker}`
		} else if(country != undefined){ 
			searchTerm = `"${name}" ${country}`
		} else {
			searchTerm = `"${name}"`
		}

		//const googleRSSfeed = `https://news.google.com/_/rss/search?q=${searchTerm}&hl=en-SG&gl=SG&ceid=SG:en`

		//Search for news using the company name and the company website domain
		const googleRSSfeed = encodeURI(`https://news.google.com/_/rss/search?q=${searchTerm}&hl=en-SG&gl=SG&ceid=SG:en`);
		const googleRSSfeedDomain = encodeURI(`https://news.google.com/_/rss/search?q="${domain}"&hl=en-SG&gl=SG&ceid=SG:en`);
		let parser = new Parser();

		const mainFeed = await parser.parseURL(googleRSSfeed).catch((err)=>{
			console.error(err);
			return {items:[]};
		});
		const domainFeed = await parser.parseURL(googleRSSfeedDomain).catch((err)=>{
			console.error(err);
			return {items:[]};
		})
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
		const jobUrl = `https://www.indeed.com.sg/jobs?as_and=&as_phr=&as_any=&as_not=&as_ttl=&as_cmp=${name}&jt=all&st=&as_src=&radius=10&l=Singapore&fromage=any&limit=10&sort=&psf=advsrch`
		request(jobUrl,(err,resp,body)=>{
			if(err){
				reject(err);
				return;
			}
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
				shares: '',
				news:'',
				jobs:'',
			}

			let shares = await getShares(url);
			let news = await getNews(name,country,domain);
			let jobs = await getJobs(name);

			social.shares = shares;
			social.news = news;
			social.jobs = jobs;

			resolve(social)
		})
	}
})