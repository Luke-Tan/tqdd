import request from 'request';
import cheerio from 'cheerio';
import nodeUrl from 'url';

export default function getYeluSgInfo(url){
	return new Promise((resolve,reject)=>{
		if(url != undefined){
	        request(url,(err,resp,body)=>{
	            //console.log(body)
	            let $ = cheerio.load(body)
	            const phone = $('.phone').text();
	            //console.log(phone)
	            const address = $('.location').text();
	            let employees = '';
	            let year = '';
	            const infos = $('.info');
	            $(infos).each((i,e)=>{
	                const text = $(e).text();
	                const lowerText = text.toLowerCase();
	                const strLength = lowerText.length;
	                if(lowerText.includes('employees')){
	                    const start = lowerText.indexOf('employees');
	                    const termLength = 'employees'.length;
	                    const end = start+termLength;
	                    
	                    employees = text.slice(end,strLength);
	                }
	                if(lowerText.includes('year')){
	                    const start = lowerText.indexOf('year');
	                    const termLength = 'year'.length;
	                    const end = start+termLength;
	                    
	                    year = text.slice(end,strLength);
	                }
	                //console.log(text)
	            });
	            
	            const companyDetails = {
	                phone:phone,
	                address:address,
	                employees:employees,
	                year:year
	            }
	            resolve(companyDetails)
	        })
		} else {
			resolve({});
		}
	})
}