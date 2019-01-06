//import whois from 'whois-api';
//import whois from 'whois';
import whois from './whoisjson/whois-json.js';

Meteor.methods({
	whoIs(url){
		return new Promise((resolve,reject)=>{
			whois(url, (error, result)=>{
				if(error){
					reject(error);
				}
				resolve(result);
			})
		})
	}
});