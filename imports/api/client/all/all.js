export function getName(url,callback){	
	Meteor.call('getName',url,(err,result)=>{
		const companyName = result;
 		callback(companyName)
	})
}