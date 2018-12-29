import request from 'request';
import cheerio from 'cheerio';
import nodeUrl from 'url';

export default function getZipleafSgInfo(name){
	return new Promise((resolve,reject)=>{
			const searchUrl = `https://sg.zipleaf.com/Search.html?q=${name}`
			request(searchUrl,(err,resp,body)=>{
				try{
				    let $ = cheerio.load(body)
				    const href = $('.listings').children('h3').children('a').first().attr('href');
				    const zipleafProfile = nodeUrl.resolve('https://sg.zipleaf.com',href);
				    request(zipleafProfile,(err,resp,body)=>{
				    	try{
					        let $ = cheerio.load(body);
				        	/* Extract phone number only */
					        const phone = $('.fa-phone').parent().text().replace(/[^0-9]/g,"");
					        const address = $('[itemprop=street-address]').text();
					        /* Replace the first two // to get a workable url */
					        const logo = $('[itemprop=image]').attr('src').replace(/^.{2}/g,"")
					        const companyDetails = {
					        	phone:phone,
					        	address:address,
					        	logo:logo
					        }
					        resolve(companyDetails);
				    	}
				    	catch(error){
				    		//console.error(error);
				    		resolve({});
				    	}
				    })
				}
				catch(error){
					//console.error(error);
					resolve({})
				}
			    // console.log(listings)
			    // console.log(body)
			})
	})
}