import request from 'request';
import cheerio from 'cheerio';
import nodeurl from 'url';

export function getYeluSgInfo(name){
	const googleQuery = `https://www.google.com.sg/search?q=site%3Ayelu.sg+${name}`
	request(googleQuery,(err,resp,body)=>{
	    if(err){
	        reject(err);
	    }
	    let $ = cheerio.load(body);
	    let links = $('a');
	    let noYeluProfileFound = true;
	    links.each((i,e)=>{
	        let link = $(e).attr('href');
	        if(link.includes('yelu.sg/company')){
	        	noYeluProfileFound = false;
		        const pos = link.indexOf('&sa');
		        let url = link.slice(7,pos);
		        console.log(url)
		        request(url,(err,resp,body)=>{
		            console.log(body)
		            let $ = cheerio.load(body)
		            const phone = $('.phone').text();
		            console.log(phone)
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
		        return false;
	        }
	        if(noYeluProfileFound == true){
	        	resolve({})
	        }
	    })
	})
}