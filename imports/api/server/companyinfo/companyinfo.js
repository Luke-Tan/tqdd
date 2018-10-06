"use strict";
/* Npm Modules */
import request from 'request';
import cheerio from 'cheerio';
import nodeUrl from 'url';
import fetch from 'node-fetch';
import alexaData from 'alexa-traffic-rank';

/* Fuzzy Match algorithm */
import { 
	fuzzyMatch,
	getDomain,
} from '../all/functions.js'
/*
Workflow:
1) Get company name from clearbit API using URL
2) Enter company name into Kompass search bar with request and cheerio
3) Get URL of kompass company page  from the page with request and cheerio
4) Get info from the kompass page:
    -No. of employees
    -Address
    -Year established
    -Phone number?
5) Fall back to fullcontact API if not found on kompass (100 free per month)
*/

function fullContactInfo(url){
	return new Promise((resolve,reject)=>{
		fetch('https://api.fullcontact.com/v3/company.enrich',{
			method: 'POST',
			headers: {
				"Authorization": `Bearer ${Meteor.settings.FULLCONTACT_API_KEY}`
			},
			body: JSON.stringify({
				"domain": url
			})
		}).then(function(res) {
			return res.json();
		}).then(function(json){
			console.log(JSON.stringify(json));
	        const date = new Date();
	        const year = date.getFullYear();
	        const age = year-(json.founded).toString();
			let companyDetails = {
				name:json.name,
				year:json.founded,
				employees:`${json.employees} Employees`,
				address:json.location,
				logo:json.logo,
				age:age,
				phone:json.details.phones[0].value
			}
			resolve(companyDetails);
		});	
	})	
}

function kompassInfo(name,domain,companyDetails){
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

	                    if(companyDomainFromKompass == companyDomain){
	                    	/* Year that Company was founded */
		                    const td = $('td')
		                    $(td).each((index,element)=>{
		                        const text = $(element).text().trim()
		                        if(text.length == 4 && !isNaN(text)){
		                            companyDetails.year = text
		                            const date = new Date();
		                            const year = date.getFullYear();
		                            const age = year-text.toString();
		                            companyDetails.age = age
		                        }
		                    })

		                    /* Number of employees */
		                    $('.number').each((index,element)=>{
		                    	const text = $(element).text().trim()
		                    	if(text.includes('Employees')){
		                    		companyDetails.employees = text
		                    	}
		                    })

		                    /* Company Phone Number */
						    const phoneNumberParent = $('.phoneCompany').first();
						    const phoneNumber = $(phoneNumberParent).children('input').first().attr('value');
						  	companyDetails.phone = phoneNumber;

						  	/* Company Address */
		                    const address = $('span[itemprop=streetAddress]').text().trim();
		                    const country  = $('span[itemprop=addressCountry]').text().trim();
		                    const fullAddress = `${address}, ${country}`
		                    companyDetails.address = fullAddress;
		                    resolve(companyDetails);
		                } else {
		                	resolve(companyDetails);
		                }
					})
					return false;
				}
			})
			if(noKompassProfileFound == true){
				resolve(companyDetails);
			}
		})
	})
}

function jobstreetInfo(name,companyDetails){
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
	                                    if(text.toLowerCase().includes('benefits')){
	                                        benefits = $(e).children('p').text();
	                                    }
	                                    if(text.toLowerCase().includes('contact number')){
	                                        phone = $(e).children('p').text();
	                                    }
	                                });
	                                const details = {
	                                    name:name,
	                                    logo:logo,
	                                    employees:employees,
	                                    benefits:benefits,
	                                    phone:phone,
	                                    address:address
	                                }

	                                for(let key in details){
	                                	const value = details[key];
	                                	if(Boolean(value) != false){
	                                		companyDetails[key] = value;
	                                	}
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

Meteor.methods({
	getCompanyInfo(domain,name){
		return new Promise(async (resolve,reject)=>{
			/* Basic schema should look like this, details will be filled in accordingly depending on what we can get from each 
			company profile website */
			let companyDetails = {
				name:name,
				logo:`https://logo-core.clearbit.com/${domain}`,
				year:'',
				employees:'',
				address:'',
				phone:''
			}

			companyDetails = await kompassInfo(name,domain,companyDetails); 
			companyDetails = await jobstreetInfo(name,companyDetails);
			//console.log(companyDetails2);

			resolve(companyDetails);

		})
	},
	getWebsiteInfo(url){
		return new Promise((resolve,reject)=>{
			alexaData.AlexaWebData(url, function(error, result) {
				if(error){
					reject(error)
				}
			    resolve(result)
			})
		})
	}
})



