import request from 'request';
import cheerio from 'cheerio';
import nodeUrl from 'url';

export default function getJobstreetInfo(url){
    return new Promise((resolve,reject)=>{
    	if(url != undefined){
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
    	} else {
    		resolve({})
    	}
    })
}