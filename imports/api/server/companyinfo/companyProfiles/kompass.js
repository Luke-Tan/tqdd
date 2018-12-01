import request from 'request';
import cheerio from 'cheerio';
import nodeUrl from 'url';

import { 
	getDomain,
} from '../../all/functions.js'

export default function getKompassInfo(url,domain){
	return new Promise((resolve,reject)=>{
		if(url != undefined){
			request(url,(err,resp,body)=>{
	            let $ = cheerio.load(body)

	            const companyUrlFromKompass = $('#website').attr('href');
	            let companyDomainFromKompass;

	            if(Boolean(companyUrlFromKompass) != false){
					companyDomainFromKompass = getDomain(companyUrlFromKompass);
	            } else {
	 				companyDomainFromKompass = '';
	            }
	            
	            const companyDomain = domain;


	            let phone = '';
	            let address = '';
	            let age = '';
	            let year = '';
	            let employees = ''

	            if(companyDomainFromKompass == companyDomain){
	            	/* Year that Company was founded */
	                const td = $('td')
	                $(td).each((index,element)=>{
	                    const text = $(element).text().trim()
	                    if(text.length == 4 && !isNaN(text)){
	                    	const yearFounded = text.toString()
	                        const date = new Date();
	                        const currentYear = date.getFullYear();
	                        year = yearFounded;
	                        age = currentYear-yearFounded
	                    }
	                })

	                /* Number of employees */
	                $('.number').each((index,element)=>{
	                	const text = $(element).text().trim()
	                	if(text.includes('Employees')){
	                		employees = text
	                	}
	                })

	                /* Company Phone Number */
				    const phoneNumberParent = $('.phoneCompany').first();
				    const phoneNumber = $(phoneNumberParent).children('input').first().attr('value');
				  	phone = phoneNumber;

				  	/* Company Address */
	                const address = $('span[itemprop=streetAddress]').text().trim();
	                const country  = $('span[itemprop=addressCountry]').text().trim();
	                const fullAddress = `${address}, ${country}`

	                //address = fullAddress;

	                const companyDetails = {
	                	age:age,
	                	phone:phone,
	                	address:fullAddress,
	                	employees:employees,
	                	year:year
	                }

	                resolve(companyDetails);
	            } else {
	            	resolve({});
	            }
			})
		} else {
			resolve({})
		}
	})
}