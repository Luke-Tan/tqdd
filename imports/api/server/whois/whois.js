//import whois from 'whois-api';
import Future from 'fibers/future';
//import whois from 'whois';
import whois from './whoisjson/whois-json.js';


// var Future = Npm.require( 'fibers/future' ); 

Meteor.methods({
	whoIs(url){
		let data;
		let future = new Future();
		whois(url, (error, result)=>{
			const resSTR = JSON.stringify(result);
			//console.log(result);
			console.log(result);
			future["return"](result);
		})
		return future.wait();
	}
});