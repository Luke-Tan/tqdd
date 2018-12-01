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
		return new Promise(async (resolve,reject)=>{
			/* Company detail schema */
			let companyDetails = {
				name:name,
				logo:`https://logo-core.clearbit.com/${domain}`,
				year:'',
				employees:'',
				address:'',
				phone:''
			}

			/* Info that we find here must adhere to the above schema!! */
			const kompassInfo = await getKompassInfo(name,domain);
			const jobstreetInfo = await getJobstreetInfo(name);
			const recommendSgInfo = await getRecommendSgInfo(name);
			const yeluSgInfo = await getYeluSgInfo(name);

			let listInfo = [
				kompassInfo,
				jobstreetInfo,
				recommendSgInfo,
				yeluSgInfo
			]

			/* 
				We will fill in the mising data for companyDetails here based on the above schema
			*/

			for(let info of listInfo) {
				for(let prop in info){
					if(companyDetails[prop] == ''){
						companyDetails[prop] = info[prop];
					}
				}
			}

			console.log(companyDetails);
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



