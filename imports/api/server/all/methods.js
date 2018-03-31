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
	},
	getGoogleLinks(query){
		var future = new Future();
		const apiKey = 'AIzaSyC5Uhd7oSMRAoyXRH6JR5TF1ZYYnAxT6Ws';
		const cx = '001667370438783560875:zefmarr8i8w';
		const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${query}`;
		//console.log(url);
		// https.get(url, res => {
		//   res.setEncoding("utf8");
		//   let body = "";
		//   res.on("data", data => {
		//     body += data;
		//   });
		//   res.on("end", () => {
		//     body = JSON.parse(body);
		//     console.log(
		//       `City: ${body.results[0].formatted_address} -`,
		//       `Latitude: ${body.results[0].geometry.location.lat} -`,
		//       `Longitude: ${body.results[0].geometry.location.lng}`
		//     );
		//   });
		// });
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

