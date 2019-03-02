export function getSocial(url,domain,name,country,render){
	Meteor.call('getSocial',url,domain,name,country,(err,result)=>{
		if(!err){
			const social = [result]
			Session.set('social', social);	
		} else {
			Session.set('social', social);
		}
		if(render != undefined){
			render();
		}
	})
} 