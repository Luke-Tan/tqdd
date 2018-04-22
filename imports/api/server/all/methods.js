import request from 'request';
import Future from 'fibers/future';
import cheerio from 'cheerio';
import url from 'url';

Meteor.methods({
	checkForValidUrl(url){
		let future = new Future();
		request({url:url, timeout:10000},function(err,resp,body){
			if(!err && resp.statusCode ==200){
				future['return'](true);
			} else {
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
	getGoogleLinks(query){
		let future = new Future();
		const apiKey = Meteor.settings.GOOGLE_API_KEY;
		const cx = '001667370438783560875:zefmarr8i8w';
		const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${query}`;
		request(url,function(err,resp,body){
			let bodyJSON = JSON.parse(body);
			let results = bodyJSON.items;
			let linksArray = [];
			results.forEach((item)=>{
				linksArray.push(item.link);
			});
			console.log(linksArray);
		});
		// return future.wait();
	}
});

