export function getCompanyInfo(fullUrl,domain,name,body,render){	
	Meteor.call('getCompanyInfo',fullUrl,domain,name,body,(err,result)=>{
		if(!err){
			const companyInfo = [result];
			Session.set('companyInfo', companyInfo);
		} else {
			Session.set('companyInfo','')
		}
        if(render !== undefined){
            render();
        }
	})
	Meteor.call('getWebsiteInfo',domain,name,(err,result)=>{
		const websiteInfo = result;
		if(!err){
			Session.set('websiteInfo',websiteInfo);
		} else {
			Session.set('websiteInfo','');
		}
	})	
}