export function getCompanyInfo(domain,name,render){	
	Meteor.call('getCompanyInfo',domain,name,(err,result)=>{
		const companyInfo = [result];
		Session.set('companyInfo', companyInfo);
        if(render !== undefined){
        	console.log('hello')
            render();
        }
	})
	Meteor.call('getWebsiteInfo',domain,name,(err,result)=>{
		const websiteInfo = result;
		Session.set('websiteInfo',websiteInfo);
	})	
}