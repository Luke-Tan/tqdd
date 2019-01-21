export function getCompanyInfo(fullUrl,domain,name,body,render){	
	Meteor.call('getCompanyInfo',fullUrl,domain,name,body,(err,result)=>{
		const companyInfo = [result];
		Session.set('companyInfo', companyInfo);
        if(render !== undefined){
            render();
        }
	})
	Meteor.call('getWebsiteInfo',domain,name,(err,result)=>{
		const websiteInfo = result;
		Session.set('websiteInfo',websiteInfo);
	})	
}