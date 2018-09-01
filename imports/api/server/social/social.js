/* Npm modules */
import request from 'request'
import cheerio from 'cheerio'
//import NewsAPI from 'newsapi'

// const newsapi = new NewsAPI(Meteor.settings.NEWS_API_KEY);

import {
	getName,
	getDomain
} from '../all/functions.js';

/*
Info:
1. Number of times mentioned on google 'xxx results from google search ' => "Number of times mentioned on the web"
2. Social shares
3. Relevant news features from newsapi
*/

function getMentions(name){
	return new Promise((resolve,reject)=>{
		const googleUrl = `https://www.google.com.sg/search?q=%22${name}%22`;
		request(googleUrl,(err,resp,body)=>{
			if(err){
				reject(err)
			}
			let $ = cheerio.load(body);
			let mentions = $('#resultStats').text();
			/* Mentions will be in the format "About XXX results, so we need to extract the number only"`*/
			mentions = mentions.replace('About ','');
			mentions = mentions.replace(' results','');
			resolve(mentions);
		})
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
				body = body.replace(`receiveCount(`,'');
				body = body.replace(`)`,'');
				const json = JSON.parse(body);
				const pinterestShares = json.count;
				resolve(pinterestShares);
			})			
		})
	}
	function getStumbles(url){
		return new Promise((resolve,reject)=>{
			// const stumbledEndPoint = `http://www.stumbleupon.com/services/1.01/badge.getinfo?url=${url}`
			// request(stumbledEndPoint,(err,resp,body)=>{
			// 	if(err){
			// 		reject(err)
			// 	}
			// 	console.log(body);
			// 	let stumbledShares
			// 	if(resp.statusCode == 200){
			// 		const json = JSON.parse(body);
			// 		stumbledShares = json.result.views;
			// 		if(stumbledShares == undefined){
			// 			stumbledShares = 0;
			// 		}
			// 	} else {
			// 		stumbledShares = 0;
			// 	}
			// 	resolve(stumbledShares);
			// })	
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

function getNews(name){
	return new Promise((resolve,reject)=>{
		// newsapi.v2.everything({
		//   q: name,
		//   language: 'en',
		//   category:'business'
		// }).then(response => {
		//   console.log(response);
		//   /*
		//     {
		//       status: "ok",
		//       articles: [...]
		//     }
		//   */
		// });
		// const NEWS_API_KEY  = Meteor.settings.NEWS_API_KEY
		// const newsAPIendpoint = `https://newsapi.org/v2/everything?q=${name}&apiKey=${NEWS_API_KEY}`;
		// //console.log(newsAPIendpoint);
		// request(newsAPIendpoint,(err,resp,body)=>{
		// 	if(err){
		// 		reject(err);
		// 	}
		// 	//console.log(body);
		// 	const json = JSON.parse(body);
		// 	const count = json.totalResults;
		// 	const articles = json.articles;
		// 	let news  = {
		// 		count:count,
		// 		articles:articles
		// 	}
		// 	resolve(news)
		// })
		const query = name;
		const newsUrl = `https://www.google.com/search?q="${query}"&tbm=nws`
		request(newsUrl, (err,resp,body)=>{
			if(err){
				reject(err)
			}
		    //console.log(body)
		    let $ = cheerio.load(body)
		    let links = $('a')
		    let newsLinks = []
		    let news = []
		    links.each((i,e)=>{
		        let link = $(e).attr('href')
		        if(link.includes('/url') && !link.includes('webcache')){
		        	/*The URL in Google's href contains some weird clutter. Slice it at the correct position to obtain a valid URL*/
		            const position = link.indexOf('&sa')
		            const url = link.slice(7,position)
		            if(newsLinks.indexOf(url) == -1){
		            	/* For some reason there are more than 1 of the same URL. If the array doesn't already contain it, then add it. */
		                newsLinks.push(url)
		                const linkContainer = $(e).parent();
		                const snippet = $(linkContainer).next().next().text();
		                if(snippet.includes(query)){
		                    const title = $(e).text();
		                    const thumbnail = $(linkContainer).parent().next().children().first().children().attr('src')
		                    const publishDetails = $(linkContainer).next().text();
		                    /*The format is e.g. The New Paper - 27th September 2017. Slice it by the - to seperate into data and publisher*/
		                    const position = publishDetails.indexOf('-');
		                    const publisher = publishDetails.slice(0,position-1);
		                    const date = publishDetails.slice(position+2,publishDetails.length)
		                    const newsObject = {title:title,date:date,snippet:snippet,publisher:publisher,thumbnail:thumbnail,url:url};
		                    news.push(newsObject)
		                }
		            }
		        }
		    })
		    resolve(news);
		})
	})
}

function getJobs(name){
	return new Promise((resolve,reject)=>{
		const jobUrl = `https://www.indeed.com.sg/jobs?q=${name}`
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

function getNameFromGoogle(domain){
	return new Promise((resolve,reject)=>{
		const googleUrl = `https://www.google.com.sg/search?q="${domain}"`
		request(url)
	})
}

Meteor.methods({
	getSocial(url,domain,name){
		return new Promise(async (resolve,reject)=>{
			let social = {
				name:'',
				mentions: '',
				shares: '',
				news:'',
				jobs:''
			}

			//console.log(json)
			const domainName = getName(domain)

			// console.log(name)
			let mentions = await getMentions(name);
			let shares = await getShares(url);
			let news = await getNews(domainName);
			let jobs = await getJobs(name);

			if(jobs.length == 0){ 	//if jobs returns an empty array, it means jobs werent found with the name, try searching with domainname
				console.error('Using domain for jobs')
				jobs = await(getJobs(domainName));
			}

			if(news.length == 0){	//if news returns an empty array, it means news wasnt found with the domainname, try searching with name
				news = await(getNews(name));
			}

			social.name = name;
			social.mentions = mentions;
			social.shares = shares;
			social.news = news;
			social.jobs = jobs;
			//console.log(social);
			resolve(social)
		})
	}
})