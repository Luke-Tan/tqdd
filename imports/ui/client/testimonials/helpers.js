import { Template } from 'meteor/templating';

import './testimonials.html';

Template.testimonials_template.helpers({
    testimonials(){
        return Session.get('testimonials');
    },
});