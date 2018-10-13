import { Template } from 'meteor/templating';
import { updateTestimonials , testScores } from '/imports/api/client/testimonials/testimonials.js'
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

Template.testimonial_template.events({
  'click .upvote'(event) {
    const text = this.text
    const id = this.id
    const scores = this.scores;

    console.log(this);
    //Change colors of thumbs up/down buttons
    const thumbUp = event.target
    thumbUp.classList.remove('grey-text');   
    thumbUp.classList.remove('green-text');   
    thumbUp.classList.add('green-text'); 
    const thumbDown = document.getElementById(id+'_thumbdown');
    thumbDown.classList.remove('red-text');
    thumbDown.classList.remove('grey-text');
    thumbDown.classList.add('grey-text');

    //Propagate upvote/downvote to db
    updateTestimonials(text,'correct');
    testScores(text,'correct',scores)
  },
  'click .downvote'(event) {
    const text = this.text
    const id = this.id
    const scores = this.scores
    //Change colors of thumbs up/down buttons
    const thumbDown = event.target
    thumbDown.classList.remove('red-text');
    thumbDown.classList.remove('grey-text');
    thumbDown.classList.add('red-text');
    const thumbUp = document.getElementById(id+'_thumbup');  
    thumbUp.classList.remove('green-text');
    thumbUp.classList.remove('grey-text');
    thumbUp.classList.add('grey-text');

    //Propagate upvote/downvote to db
    updateTestimonials(text,'wrong')
    testScores(text,'wrong',scores)
  },
});