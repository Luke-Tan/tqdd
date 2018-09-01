import { Template } from 'meteor/templating';

import './whois.html';

Template.whois_template.helpers({

    registrantData(){
        return Session.get('registrantData');
    },
    adminData(){
        return Session.get('adminData');
    },
    techData(){
        return Session.get('techData');
    },
    otherData(){
        return Session.get('otherData');
    },
    noRegistrantDataFound(){
        let testimonials = Session.get('registrantData');
        if(testimonials != undefined){
            if(testimonials[0] == undefined){   //Testimonials is an empty array
                return true
            } else {
                return false
            }
        } else {
            return false
        }
    },
    noAdminDataFound(){
        let testimonials = Session.get('adminData');
        if(testimonials != undefined){
            if(testimonials[0] == undefined){   //Testimonials is an empty array
                return true
            } else {
                return false
            }
        } else {
            return false
        }
    },
    noTechDataFound(){
        let testimonials = Session.get('techData');
        if(testimonials != undefined){
            if(testimonials[0] == undefined){   //Testimonials is an empty array
                return true
            } else {
                return false
            }
        } else {
            return false
        }
    },
    noOtherDataFound(){
        let testimonials = Session.get('otherData');
        if(testimonials != undefined){
            if(testimonials[0] == undefined){   //Testimonials is an empty array
                return true
            } else {
                return false
            }
        } else {
            return false
        }
    },
});