import request from 'request';
import cheerio from 'cheerio';
import nodeurl from 'url';

export function getJobstreetInfo(name){
    const googleQuery = `https://www.google.com.sg/search?q="jobstreet"+${name}`;
    return new Promise((resolve,reject)=>{
	    request(googleQuery,(err,resp,body)=>{
	    	if(err){
	    		reject(err);
	    	}
	        let $ = cheerio.load(body);
	        
	        let links = $('a')
	        let jobstreetLink = ''
	        let noJobstreetProfileFound = true;
	        links.each((i,e)=>{
	            let link = $(e).attr('href')
	            //if(link.includes('/url') && !link.includes('webcache') && !link.includes('job-search')){
	            if(link.includes('/en/companies')){
	            	noJobstreetProfileFound = false;
	                const pos = link.indexOf('&sa')
	                let url = link.slice(7,pos)
	                
	                request(url,(err,resp,body)=>{
	                    let $ = cheerio.load(body)
	                    const links = $('a._1JhFSbFzrI-KbE6gijcuEv');
	                    $(links).each((i,e)=>{
	                        const href = $(e).attr('href')
	                        const text = $(e).text();
	                        const url = nodeUrl.resolve('https://www.jobstreet.com.sg/', href); 
	                        if(text == 'Overview'){
	                            request(url,(err,resp,body)=>{
	                                $ = cheerio.load(body)
	                                const logo = $('img._1Cy6lcihWpceLLGB3qdmV1').first().attr('data-cfsrc');
	                                
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
	                                    name:name,
	                                    logo:logo,
	                                    employees:employees,
	                                    phone:phone,
	                                    address:address
	                                }

	                                resolve(companyDetails);
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
	                })
	                return false
	            }
	        })
	        if(noJobstreetProfileFound == true){
	        	resolve(companyDetails)
	        }
	    })
    })
}