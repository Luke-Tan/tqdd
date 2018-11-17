import fetch from 'node-fetch';

export function getFullContactInfo(url){
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