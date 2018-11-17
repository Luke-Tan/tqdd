import request from 'request';
import cheerio from 'cheerio';
import nodeUrl from 'url';

export function getKompassInfo(name,domain){
	const googleQuery = `https://www.google.com.sg/search?q="kompass"+${name}`;
	return new Promise((resolve,reject)=>{
		request(googleQuery,(err,resp,body)=>{
			if(err){
				reject(err);
			}
			let $ = cheerio.load(body);
			let links = $('a');
			let noKompassProfileFound = true;
			links.each((i,e)=>{
				let link = $(e).attr('href');
				if(link.includes('kompass.com/c')){
					noKompassProfileFound = false;
					console.log(link);
					const pos = link.indexOf('&sa');
					let url = link.slice(7,pos);

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
	                    console.log(companyDomain);
	                    console.log(companyDomainFromKompass);

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
		                            year = text
		                            const date = new Date();
		                            const year = date.getFullYear();
		                            age = year-text.toString();
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

		                    address = fullAddress;

		                    const companyDetails = {
		                    	age:age,
		                    	phone:phone,
		                    	address:address,
		                    	employees:employees,
		                    }

		                    resolve(companyDetails);
		                } else {
		                	resolve({}});
		                }
					})
					return false;
				}
			})
			if(noKompassProfileFound == true){
				resolve({}});
			}
		})
	})
}