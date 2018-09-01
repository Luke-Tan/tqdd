export function getTestimonials(url, render) {
    Meteor.call('getTestimonials',url,(err,result)=>{
        console.log(result);
        Session.set('testimonials', result);
        if(render !== undefined){
            render();
        }
    });
}

export function updateTestimonials(text,type){
	Meteor.call('updateTestimonials',text,type);
}
