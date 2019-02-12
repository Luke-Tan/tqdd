export function getTestimonials(url, render) {
    Meteor.call('getTestimonials',url,(err,result)=>{
        const testimonials = result;
        Session.set('testimonials', testimonials);
        if(render !== undefined){
            render();
        }
    });
}

export function updateTestimonials(text,type){
	Meteor.call('updateTestimonials',text,type);
}