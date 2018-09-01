import { Template } from 'meteor/templating';

import './social.html';

Template.social_template.helpers({
    social(){
        return Session.get('social');
    },
});