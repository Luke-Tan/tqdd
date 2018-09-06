"use strict";
/* Npm Modules */
import request from 'request';
import cheerio from 'cheerio';
import nodeUrl from 'url';
import fetch from 'node-fetch';
import alexaData from 'alexa-traffic-rank';
import csv from "csv-query";

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

function fallBack(url){
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

Meteor.methods({
	getCompanyInfo(url,name,logo){
		return new Promise((resolve,reject)=>{
			let companyDetails = {
				name:'',
				year:'',
				employees:'',
				address:'',
				logo:'',
				age:'',
				phone:''
			}

			const companyUrl = url;
			//console.log(`Logo ${logo}`)
		    companyDetails.name = name;
		    companyDetails.logo = `https://logo-core.clearbit.com/${url}`
		    companyDetails.employees = "0-9 Employees"
		    const truncatedName = name.split(' ').slice(0,2).join(' '); //Get first 2 words of clearbit name only as that is usually enough to give a wider search
		    const escapedTruncatedName = truncatedName.replace(/’/g, '%27'); //Replace all apostrophes with escaped chars so that request works
		    const fuzzyMatchedName = truncatedName.replace(/[^0-9a-zA-Z ]/g,''); //Remove all non aplha-numeric and white space characters so that fuzzy match works
		    //console.log(escapedTruncatedName);
		    const kompassURL= `https://www.kompass.com/searchCompanies?acClassif=&localizationCode=&localizationLabel=&localizationType=&text=${escapedTruncatedName}&searchType=COMPANYNAME`
		    request(kompassURL,(err,resp,body)=>{
				if(err){
					console.error(err)
					reject(err)
				}			    	
		        let $ = cheerio.load(body);
		        const parents = $('.place');
		        const links = $(parents).children('a')
		        if($(links).length > 0){	//Check if kompass search yields any results, if not fallback
			        $(links).each((index,element)=>{
			            const href = $(element).attr('href')
			            console.log(href)
			            console.log(fuzzyMatchedName)
			            if(fuzzyMatch(fuzzyMatchedName,href)==true){	// Check eaach link if they fuzzymatch the name. If not, fallback
			                const companyKompassUrl = nodeUrl.resolve('https://www.kompass.com', href)
			                request(companyKompassUrl,(err,resp,body)=>{
            					if(err){
									reject(err)
								}
			                    let $ = cheerio.load(body)

			                    /* First we check if its the page we want by comparing the website URL to our own URL */

			                    const companyUrlFromKompass = $('#website').attr('href');
			                    const companyDomainFromKompass = getDomain(companyUrlFromKompass);
			                    const companyDomain = getDomain(companyUrl);
			                    console.log(companyDomain);
			                    console.log(companyDomainFromKompass);

			                    if(companyDomain == companyDomainFromKompass){
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
				                	//companyDetails.employees = "0-9 Employees"
				                	 resolve(companyDetails);
				                	//resolve(fallBack(companyUrl));
				                	//resolve(companyDetails)
				                }
			                });
			                return false; 
			            } else {
			            	//resolve(fallBack(companyUrl))
			            	resolve(companyDetails)
			            }
			        })
			    } else {
	            	//resolve(fallBack(companyUrl))
	            	resolve(companyDetails)
			    }
		    });
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



