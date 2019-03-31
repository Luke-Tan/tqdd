import request from 'request';
import cheerio from 'cheerio';
import nodeUrl from 'url';
import { filter } from 'fuzzaldrin';

export default function getJobstreetInfo(url,name){
    return new Promise((resolve,reject)=>{
    	if(url != undefined){
    		console.log(url)
	        request(url,(err,resp,body)=>{
	        	if(err){
	        		reject(err)
	        		return
	        	}
	        	try{
	        		// console.log(body);
		            let $ = cheerio.load(body)
		            const links = $('a._1d_9MufDejf5MoIonfRIRk');
		            $(links).each((i,e)=>{
		                const href = $(e).attr('href')
		                const text = $(e).text();
		                const url = nodeUrl.resolve('https://www.jobstreet.com.sg/', href); 
		                if(text == 'Overview'){
		                    request(url,(err,resp,body)=>{
		                        $ = cheerio.load(body)
		                        const nameFromJobStreet = $('._12x74-XLiHCJbGS0ymy4W3').text();
		                        console.log(name);
		                        console.log(nameFromJobStreet);
		                        const results = filter([name], nameFromJobStreet);
		                        const results2 = filter([nameFromJobStreet],name);
		                        if(results.length > 0 || results2.length > 0){
			                        let logo = $('img._1Cy6lcihWpceLLGB3qdmV1').first().attr('data-cfsrc');
			                        if(Boolean(logo) == false){
			                        	logo = $('img._1Cy6lcihWpceLLGB3qdmV1').first().attr('src');
			                        }
			                        
			                        const profileDetails = $('div._1qlCWY2bxtwAV57sq3F17P')
			                        const address = $('address').text();
			                        let employees;
			                        let benefits;
			                        let phone;
			                        $(profileDetails).each((i,e)=>{
			                            const text = $(e).text();
			                            if(text.toLowerCase().includes('company size')){
			                                employees = $(e).children('p').text();
			                            }
			                            if(text.toLowerCase().includes('contact number')){
			                                phone = $(e).children('p').text();
			                            }
			                        });

			                        const companyDetails = {
			                            logo:logo,
			                            employees:employees,
			                            phone:phone,
			                            address:address
			                        }

			                        // console.log(companyDetails)
			                        resolve(companyDetails);
		                        } else {
		                        	resolve({});
		                        }

		                    })
		                }
		                // if(text == 'Reviews'){
		                //     request(url,(err,resp,body)=>{
		                //         let $ = cheerio.load(body)
		                //     })
		                // }
		                // if(text == 'Jobs'){
		                //     request(url,(err,resp,body)=>{
		                //         let $ = cheerio.load(body)
		                //     })
		                // }
		            })
		            resolve({});
	        	}
	        	catch(error){
	        		console.error(error);
	        		resolve({});
	        	}
	        })
    	} else {
    		resolve({})
    	}
    })
}