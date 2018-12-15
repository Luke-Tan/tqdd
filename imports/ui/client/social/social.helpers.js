import { Template } from 'meteor/templating';

import './social.html';

Template.social_template.helpers({
    social(){
        return Session.get('social');
    },
    isMention(type){
    	if(type == 'mention'){
    		return true
    	} else {
    		return false
    	}
    },
    isMinorSubject(type){
    	if(type == 'minor subject'){
    		return true
    	} else {
    		return false
    	}
    },
    isMajorSubject(type){
    	if(type == 'major subject'){
    		return true
    	} else {
    		return false
    	}
    }
});