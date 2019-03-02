/* Npm Modules */
import request from 'request';
import cheerio from 'cheerio';
import nodeUrl from 'url';
import fetch from 'node-fetch';
import alexaData from 'alexa-traffic-rank';

/* Fuzzy Match algorithm */
import { 
	fuzzyMatch,
} from '../all/functions.js'

import getJobstreetInfo from '/imports/api/server/companyinfo/companyProfiles/jobstreet.js';
import getKompassInfo from '/imports/api/server/companyinfo/companyProfiles/kompass.js';
import getYeluSgInfo from '/imports/api/server/companyinfo/companyProfiles/yelusg.js';
import getZipleafInfo from '/imports/api/server/companyinfo/companyProfiles/zipleaf.js';
import getTuugoInfo from '/imports/api/server/companyinfo/companyProfiles/tuugo.js';
import getOwnWebsiteInfo from '/imports/api/server/companyinfo/companyProfiles/ownWebsite.js'

/* This is a paid api that generally has most of the info we are looking for, 100 free calls per month, can fall back
to this for cases where we have no info (most 'marginal gain' for a case where we have no info), or if we need to demo or smth */
import getFullContactInfo from '/imports/api/server/companyinfo/companyProfiles/fullcontact.js'; 

Meteor.methods({
	getCompanyInfo(fullUrl,domain,name,websiteBody){
		return new Promise((resolve,reject)=>{
			/* Company detail schema */
			let companyDetails = {
				name:name,
				logo:'',
				year:'',
				employees:'',
				address:'',
				phone:'',
				email:''
			}

			const key = `AIzaSyD2mj2BjNyYUkNCrJJ3Rwx6ZuxyfkELpX4`; //api key
			const cx = `004951682930566350351:14cirkszqh4`	//search engine key
			//name = name.replace(/[^\x00-\x7F]+/g,''); // Remove all non unicode characters (stuff like chinese, japanese) so that we don't get a bad search
			name = name.replace(/’/g,`'`)			  // Replace known weird characters with similar ones that are used more often
			//name = encodeURI(name);					  // Finally, encode the whole thing to make sure we don't make a bad request
			urlName = encodeURI(name);
			const googleSearchEndpoint = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q="${urlName}"`
			request(googleSearchEndpoint, async (err,resp,body)=>{
				if(err){
					console.error(err);
				}
				let googleUrls;
				let jobStreetUrl;
				let yeluUrl;
				let kompassUrl;
				try{
					let json = JSON.parse(body);
					googleUrls = json.items
				}
				catch(error){
					console.error(error);
					googleUrls = [];
				}
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
					console.error(error);
				}
				
			    /* Own website info   
			     * phone
				 * address
				 * year
				 * email
			    */
				const ownWebsiteInfo = await getOwnWebsiteInfo(fullUrl,websiteBody).catch(error=>{
					return {};
			    });

				/* Kompass Info:
				 * age
	             * phone
	             * address
	             * employees
	             * year
				 */
				const kompassInfo = await getKompassInfo(kompassUrl,domain).catch(error=>{
					console.error(error);
					return {};
			    });

			    /* JobStreet Info
			     * logo
				 * employees
				 * phone
				 * address
			     */
				const jobstreetInfo = await getJobstreetInfo(jobStreetUrl,name).catch(error=>{
					return {};
					console.error(error)
			    });

			    /* Yelu Sg Info
	             * phone
	             * address
	             * employees
	             * year
			    */
				const yeluSgInfo = await getYeluSgInfo(yeluUrl).catch(error=>{
					console.error(error)
					return {};
			    });

			    /* Zipleaf Info
			     * phone
				 * address
				 * logo
			    */
				const zipleafInfo = await getZipleafInfo(urlName).catch(error=>{
					console.error(error)
					return {};
			    });

			    /* Tuugo Info
			     * phone
                 * address
			    */
				// const tuugoInfo = await getTuugoInfo(name).catch(error=>{
				// 	console.error(error)
				// 	return {};
			 //    });
			    
				/* Info that we find here must adhere to the above schema!! 
				 * This should be arranged according to level of reliability/accuracy, the best ones should be in front
				*/
				let listInfo = [
					ownWebsiteInfo,
					kompassInfo,
					jobstreetInfo,
					yeluSgInfo,
					zipleafInfo,
					//tuugoInfo,
				]
				/* We will fill in the mising data for companyDetails here based on the above schema */
				for(let info of listInfo) {
					for(let prop in info){
						if(companyDetails[prop] == ''){
							companyDetails[prop] = info[prop];
						}
					}
				}
				if(Boolean(companyDetails.logo) == false){
					/* This logo may or may not be blank, but there is no way to check. 
					If there is no logo obtained from the above profiles, then fall back to this.*/
					const clearbitLogo = `https://logo-core.clearbit.com/www.${domain}`
					companyDetails.logo = clearbitLogo;
				}
				// If we can't find ANYTHING, use full contact 
				if(
					Boolean(companyDetails.year) == false &&
					Boolean(companyDetails.employees) == false &&
					Boolean(companyDetails.address) == false &&
					Boolean(companyDetails.phone) == false
				) {
					companyDetails = await getFullContactInfo(domain).catch(error=>{
						return {};
				    });
				}
				resolve(companyDetails);
			})
		})
	},
	getWebsiteInfo(url){
		return new Promise((resolve,reject)=>{
			alexaData.AlexaWebData(url, function(error, result) {
				if(error){
					reject(error)
					return;
				}
			    resolve(result)
			})
		})
	}
})



