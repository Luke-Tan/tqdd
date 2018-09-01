export function getCompanyInfo(url,name,logo,render){	
	Meteor.call('getCompanyInfo',url,name,logo,(err,result)=>{
		const companyInfo = [result];
		Session.set('companyInfo', companyInfo);
        if(render !== undefined){
        	console.log('hello')
            render();
        }
	})
	Meteor.call('getWebsiteInfo',url,name,(err,result)=>{
		const websiteInfo = result;
		Session.set('websiteInfo',websiteInfo);
	})	
}