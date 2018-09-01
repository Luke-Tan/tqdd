export function getSocial(url,domain,name,render){
	Meteor.call('getSocial',url,domain,name,(err,result)=>{
		const social = [result]
		console.log(social);
		Session.set('social', social);
		if(render != undefined){
			render();
		}
	})
}