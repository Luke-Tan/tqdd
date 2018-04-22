import { Template} from 'meteor/templating';

import './logos.html';

Template.logos_template.helpers({
    logos(){
        return Session.get('logos');
    },
    foundLogos(){
        let logos = Session.get('logos');
        if(logos != undefined){
            if(logos[0] == undefined) {
                return false;
            } else {
                return true;
            }
        } else {
            return true;
        }
    }
});