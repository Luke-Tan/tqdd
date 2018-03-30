import request from 'request';
import Future from 'fibers/future';
import cheerio from 'cheerio';
import url from 'url';

Meteor.methods({
	getUrls(url,bareUrl){
		if(url.slice(0, -1) != '/'){
			url += '/';
		}
		var future = new Future();
		request(url,function(err,resp,body){
			if(err){
				future["return"]('error');
			} else {
				$ = cheerio.load(body);
				var links = $('a');
				var linksArray = [];
				$(links).each(function(i, link){
					let href = $(link).attr('href');
					if(href !== undefined){
						if(href.charAt(0)=='/'){
							// console.log(href);
							href = url.slice(0, -1)+href;
							//href = url.resolve(url, href)
							// console.log(href);
						}
						if(href.includes(bareUrl)){
							if(!linksArray.includes(href)){
								linksArray.push(href);
							}
						}
					}
				});
				console.log(linksArray);
				future["return"](linksArray);
			}
			//console.log('hi!!!');
			//console.log(linksArray);
		});
		return future.wait();
	}
});

