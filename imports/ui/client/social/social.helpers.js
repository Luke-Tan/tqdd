import { Template } from 'meteor/templating';

import './social.html';

Template.social_template.helpers({
    social(){
        return Session.get('social');
    },
    isMention(type){
    	if(type == 'Mention'){
    		return true
    	} else {
    		return false
    	}
    },
    isMinorSubject(type){
    	if(type == 'Minor subject'){
    		return true
    	} else {
    		return false
    	}
    },
    isMajorSubject(type){
    	if(type == 'Major subject'){
    		return true
    	} else {
    		return false
    	}
    }
});