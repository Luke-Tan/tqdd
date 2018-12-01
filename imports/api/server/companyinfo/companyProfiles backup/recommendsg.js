import request from 'request';
import cheerio from 'cheerio';
import nodeUrl from 'url';

export default function getRecommendSgInfo(name){
	const recommendUrl = `https://www.recommend.sg/find?utf8=%E2%9C%93&keyword=${name}`
	return new Promise((resolve,reject)=>{
		request(recommendUrl,(err,resp,body)=>{
		    let $ = cheerio.load(body);
		    let href = $('.provider_details').children('h5').children('a').first().attr('href')
		    if(href != undefined){
			    const profileLink = nodeUrl.resolve(recommendUrl,href);

			    request(profileLink,(err,resp,body)=>{
			        let address = '';
			        let phone = '';    
			        let $ = cheerio.load(body);
			        let contactDetails = $('.contact_details').children('p');
			        $(contactDetails).each((i,e)=>{
			            let text = $(e).text()
			            if($(e).children('i').hasClass('fa-phone')){
			                phone = text.replace(/\n/g,'').trim();
			            }
			            if($(e).children('i').hasClass('fa-map-marker')){
			                address = text.replace(/\n/g,'').trim();
			            }
			        });
			        const companyDetails = {
			            address:address,
			            phone:phone
			        }
			        resolve(companyDetails);
			    });
		    } else {
		    	resolve({})
		    }
		})
	})
}
