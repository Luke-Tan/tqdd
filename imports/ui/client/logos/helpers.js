import { Template} from 'meteor/templating';

import './logos.html';

Template.logos_template.helpers({
    logos(){
        return Session.get('logos');
    },
    noLogosFound(){
        let logos = Session.get('logos');
        if(logos != undefined){
            if(logos[0] == undefined) { //Logos is an empty array
                return true;
            } else {                    //Logos is a valid array 
                return false;
            }
        } else {                        //Logos remains undefined i.e. search has NOT yet completed
            return false;
        }
    }
});

/*

return false ->     show 'No logos found'

return true ->      show whatever logos is, either undefined(nothing) or valid logos with pictures

*/