import { Template } from 'meteor/templating';

import './testimonials.html';

Template.testimonials_template.helpers({
    testimonials(){
    	let testimonials = Session.get('testimonials');
        return testimonials;
    },
    noTestimonialsFound(){
    	let testimonials = Session.get('testimonials');
    	if(testimonials != undefined){
    		if(testimonials[0] == undefined){	//Testimonials is an empty array
    			return true
    		} else {
    			return false
    		}
    	} else {
    		return false
    	}
    }
});