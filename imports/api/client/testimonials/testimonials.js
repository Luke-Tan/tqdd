export function getTestimonials(url, render) {
    Meteor.call('getTestimonials',url, function(err,result){
        console.log(result);
        Session.set('testimonials', result);
        if(render !== undefined){
            render();
        }
    });
}
