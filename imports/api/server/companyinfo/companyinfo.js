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
import getZipleafInfo from '/imports/api/server/companyinfo/companyProfiles/zipleaf.js';
import getTuugoInfo from '/imports/api/server/companyinfo/companyProfiles/tuugo.js';

/* This is a paid api that generally has most of the info we are looking for, 100 free calls per month, can fall back
to this for cases where we have no info, or if we need to demo or smth */
import getFullContactInfo from '/imports/api/server/companyinfo/companyProfiles/fullcontact.js'; 


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

			const key = `AIzaSyD2mj2BjNyYUkNCrJJ3Rwx6ZuxyfkELpX4`;
			const cx = `004951682930566350351:14cirkszqh4`
			const googleSearchEndpoint = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${name}`

			request(googleSearchEndpoint, async (err,resp,body)=>{
				if(err){
					reject(err);
				}
				let json = JSON.parse(body);
				//console.log(json.error.errors);
				//console.log(json);

				//console.log(body);
				let googleUrls = json.items

				/* Recommend is not scraped through Google as we can use recommends internal search engine, may switch over though*/

				let jobStreetUrl;
				let yeluUrl;
				let kompassUrl;
				//console.log(googleUrls);
				try{
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
				}
				catch(error){
					
				}
				

				const kompassInfo = await getKompassInfo(kompassUrl,domain);
				const jobstreetInfo = await getJobstreetInfo(jobStreetUrl);
				const recommendSgInfo = await getRecommendSgInfo(name);
				const yeluSgInfo = await getYeluSgInfo(yeluUrl);
				const zipleafInfo = await getZipleafInfo(name);
				const tuugoInfo = await getTuugoInfo(name);

				/* Info that we find here must adhere to the above schema!! */

				let listInfo = [
					kompassInfo,
					jobstreetInfo,
					recommendSgInfo,
					yeluSgInfo,
					zipleafInfo,
					tuugoInfo
				]

				/* We will fill in the mising data for companyDetails here based on the above schema */
				for(let info of listInfo) {
					for(let prop in info){
						if(companyDetails[prop] == ''){
							companyDetails[prop] = info[prop];
						}
					}
				}

				//

				if(Boolean(companyDetails.logo) == false){
					/* This logo may or may not be blank, but there is no way to check. 
					If there is no logo obtained from the above profiles, then fall back to this.*/
					const clearbitLogo = `https://logo-core.clearbit.com/www.${domain}`
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



