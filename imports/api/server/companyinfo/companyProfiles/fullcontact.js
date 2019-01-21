import fetch from 'node-fetch';

export default function getFullContactInfo(url){
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

	        let name = json.name;
	        let year = json.founded;
	        let employees = json.employees;
	        let logo = json.logo;
	        let phone;
	        try{
				phone = json.details.phones[0].value;
	        }
	        catch(err){
	        	phone = ''
	        }
	        let address = json.location

			let companyDetails = {
				name:name,
				year:year,
				employees:employees,
				address:address,
				logo:logo,
				phone:phone
			}

			for(let key in companyDetails){
				if(companyDetails[key] == null){
					companyDetails[key] = ''
				} 
			}
			resolve(companyDetails);
		});	
	})	
}