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

import getJobstreetInfo from '/imports/api/server/companyinfo/companyProfiles/jobstreet.js';
import getKompassInfo from '/imports/api/server/companyinfo/companyProfiles/kompass.js';
import getRecommendSgInfo from '/imports/api/server/companyinfo/companyProfiles/recommendsg.js';
import getYeluSgInfo from '/imports/api/server/companyinfo/companyProfiles/yelusg.js';

import getFullContactInfo from '/imports/api/server/companyinfo/companyProfiles/fullcontact.js'; 
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


Meteor.methods({
	getCompanyInfo(domain,name){
		return new Promise((resolve,reject)=>{
			/* Company detail schema */
			let companyDetails = {
				name:name,
				logo:'',
				year:'',
				employees:'',
				address:'',
				phone:''
			}

			/* Clearbit Logo does not tell us if it is empty or not, we check if we can find the logo from other sources first, 
			if not we use the clearbit logo */
			const clearbitLogo = `https://logo-core.clearbit.com/${domain}`
			const key = `AIzaSyD2mj2BjNyYUkNCrJJ3Rwx6ZuxyfkELpX4`;
			const cx = `004951682930566350351:14cirkszqh4`
			console.log(name);
			const googleSearchEndpoint = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${name}`

			request(googleSearchEndpoint, async (err,resp,body)=>{
				if(err){
					reject(err);
				}
				let json = JSON.parse(body);
				//console.log(json.error.errors);
				//console.log(json);
				let googleUrls = json.items

				/* Recommend is not scraped through Google as we can use recommends internal search engine, may switch over though*/

				let jobStreetUrl;
				let yeluUrl;
				let kompassUrl;
				//console.log(googleUrls);
				for(let obj of googleUrls){
					const url = obj.link
					//console.log(url)
					if(jobStreetUrl == undefined){
						if(url.includes(`jobstreet`)){
							jobStreetUrl = url
						}
					}
					if(yeluUrl == undefined){
						if(url.includes('yelu')){
							yeluUrl = url
						}
					}
					if(kompassUrl == undefined ){
						if(url.includes(`kompass`)){
							kompassUrl = url;
						}
					}
				}

				const kompassInfo = await getKompassInfo(kompassUrl,domain);
				const jobstreetInfo = await getJobstreetInfo(jobStreetUrl);
				const recommendSgInfo = await getRecommendSgInfo(name);
				const yeluSgInfo = await getYeluSgInfo(yeluUrl);

				/* Info that we find here must adhere to the above schema!! */

				let listInfo = [
					kompassInfo,
					jobstreetInfo,
					recommendSgInfo,
					yeluSgInfo
				]

				/* We will fill in the mising data for companyDetails here based on the above schema */
				for(let info of listInfo) {
					for(let prop in info){
						if(companyDetails[prop] == ''){
							companyDetails[prop] = info[prop];
						}
					}
				}
				if(companyDetails.logo == ''){
					companyDetails.logo = clearbitLogo;
				}
				console.log(companyDetails);
				resolve(companyDetails);

			})

		})
	},
	getWebsiteInfo(url){
		console.log(url);
		return new Promise((resolve,reject)=>{
			alexaData.AlexaWebData(url, function(error, result) {
				if(error){
					reject(error)
				}
				//console.log(result)
			    resolve(result)
			})
		})
	}
})



