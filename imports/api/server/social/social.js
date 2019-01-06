/* Npm modules */
import request from 'request'
import cheerio from 'cheerio'
import Parser from 'rss-parser'
import unfluff from 'unfluff'
//import NewsAPI from 'newsapi'

// const newsapi = new NewsAPI(Meteor.settings.NEWS_API_KEY);

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

function validNews(url,name){
	return new Promise((resolve,reject)=>{
		request(url,(err,resp,body)=>{
			if(err){
				reject(err)
			}
			const text = unfluff(body).text;
			
		})
	})
}

function getMentions(name,country){
	return new Promise((resolve,reject)=>{
		// const googleUrl = `https://www.google.com.sg/search?q=%22${name}%22 ${country}`;
		// request(googleUrl,(err,resp,body)=>{
		// 	if(err){
		// 		reject(err)
		// 	}
		// 	let $ = cheerio.load(body);
		// 	let mentions = $('#resultStats').text();
		// 	 //Mentions will be in the format "About XXX results, so we need to extract the number only"`
		// 	mentions = mentions.replace('About ','');
		// 	mentions = mentions.replace(' results','');
		// 	if(Boolean(mentions) == false){
		// 		console.log(body);
		// 	}
		// 	resolve(mentions);
		// })
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

function getNews(name,country,domain){
	return new Promise(async (resolve,reject)=>{
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

		let googleRSSfeed;
		if(countryMarker != undefined){
			googleRSSfeed = `https://news.google.com/_/rss/search?q="${name}" ${countryMarker}&hl=en-SG&gl=SG&ceid=SG:en` 
		} else if(country != undefined){
			googleRSSfeed = `https://news.google.com/_/rss/search?q="${name}" ${country}&hl=en-SG&gl=SG&ceid=SG:en` 
		} else {
			googleRSSfeed = `https://news.google.com/_/rss/search?q="${name}"&hl=en-SG&gl=SG&ceid=SG:en` 
		}

		//const googleRSSfeed = `https://news.google.com/_/rss/search?q=${searchTerm}&hl=en-SG&gl=SG&ceid=SG:en` 
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

						const text = unfluff(body).text;

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
		// const news = await Promise.all(promises).then(values => { 
		// 	  return(values);
		// 	})
		// 	.catch(error => { 
		// 	  console.error(error)
		// 	});

		const news = await Promise.all(promises.map(p => p.catch(e => e)));
		const validNews = news.filter(result => !(result == ''));
		//console.log(validNews);
		resolve(validNews);
		 
		// request(newsUrl, (err,resp,body)=>{
		// 	if(err){
		// 		reject(err)
		// 	}
		//     //console.log(body)
		//     let $ = cheerio.load(body)
		//     let links = $('a')
		//     let newsLinks = []
		//     let news = []
		//     links.each((i,e)=>{
		//         let link = $(e).attr('href')
		//         if(link.includes('/url') && !link.includes('webcache')){
		//         	/*The URL in Google's href contains some weird clutter. Slice it at the correct position to obtain a valid URL*/
		//             const position = link.indexOf('&sa')
		//             const url = link.slice(7,position)
		//             if(newsLinks.indexOf(url) == -1){
		//             	/* For some reason there are more than 1 of the same URL. If the array doesn't already contain it, then add it. */
		//                 newsLinks.push(url)
		//                 const linkContainer = $(e).parent();
		//                 const snippet = $(linkContainer).next().next().text();
		//                 if(snippet.includes(name)){
		//                     const title = $(e).text();
		//                     const thumbnail = $(linkContainer).parent().next().children().first().children().attr('src')
		//                     const publishDetails = $(linkContainer).next().text();
		//                     /*The format is e.g. The New Paper - 27th September 2017. Slice it by the - to seperate into data and publisher*/
		//                     const position = publishDetails.indexOf('-');
		//                     const publisher = publishDetails.slice(0,position-1);
		//                     const date = publishDetails.slice(position+2,publishDetails.length)
		//                     const newsObject = {title:title,date:date,snippet:snippet,publisher:publisher,thumbnail:thumbnail,url:url};
		//                     news.push(newsObject)
		//                 }
		//             }
		//         }
		//     })
		//     resolve(news);
		// })
	})
}

function getNewsFromDomain(domain){
	return new Promise((resolve,reject)=>{
		const newsUrl = `https://www.google.com/search?q="${domain}"&tbm=nws`
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
		                if(snippet.toLowerCase().includes(domain)){
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
	//https://www.indeed.com.sg/jobs?q=company%3A(thunderquote)
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