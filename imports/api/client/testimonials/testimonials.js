export function getTestimonials(url, render) {
    Meteor.call('getTestimonials',url,(err,result)=>{
        console.log(result);
        Session.set('testimonials', result.testimonials);
        if(render !== undefined){
            render();
        }
    });
}

export function updateTestimonials(text,type){
	Meteor.call('updateTestimonials',text,type);
}

export function testScores(text,type,scores){
	Meteor.call('testScores',text,type,scores)
}
