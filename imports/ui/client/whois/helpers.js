import { Template } from 'meteor/templating';

import './whois.html';

Template.whois_template.helpers({
    whoIsData(){
        return Session.get('whoisdata');
    },
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
    }
});