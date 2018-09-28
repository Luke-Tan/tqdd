export function getSocial(url,domain,name,country,render){
	Meteor.call('getSocial',url,domain,name,country,(err,result)=>{
		const social = [result]
		console.log(social);
		Session.set('social', social);
		if(render != undefined){
			render();
		}
	})
} 