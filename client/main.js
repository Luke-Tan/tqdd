import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

//Modules
import './main.html';
import '/imports/ui/client/content.html';
import { getWhoIs } from '/imports/api/client/whois/whois.js';
import { getWordCloud } from '/imports/api/client/wordcloud/wordcloud.js';
import { getLogos } from '/imports/api/client/logo/logo.js';
import { stripToDomain } from '/imports/api/client/all/functions.js';

BlazeLayout.render('layout', {hi:'main'});

Template.main.helpers({

});

Template.main.onRendered(function(){
	$('select').material_select();
	$('ul.tabs').tabs();
});

Template.main.events({
  'submit .scrape-url'(event, instance){
    event.preventDefault();
    document.body.style.overflow = "hidden";

    BlazeLayout.render('layout2', { top: "main",bot:"content"});
    $('#preloader').removeClass('invisible');
    $('ul.tabs').tabs('select_tab', 'wordcloud');

    const target = event.target;
    const bareUrl = target.text.value;
    const protocol = $('#protocol').find(":selected").val();
    //const www = 'www.';
    const fullUrl = protocol+bareUrl;
    alert(fullUrl);
    //const fullUrl = protocol+www+url;
    // const partialUrl = protocol+url;
    const domain = stripToDomain(fullUrl);

    Meteor.call('getUrls',fullUrl,bareUrl,(err,result) => {
        let urls = result;
        //console.log(urls);
        getWordCloud(urls);
    });
    //getWhoIs(domain);
    //getWordCloud(fullUrl); 
    // getLogos(fullUrl, () =>{
    //     $('#preloader').addClass('invisible');
    //     document.body.style.overflow = "scroll";        
    // });
  }
});

Template.content.helpers({
    whoIsData(){
        return Session.get('whoisdata');
    },
    logos(){
        return Session.get('logos');
    },
    noLogos(){
        if(Session.get('logos')==[]){
            return true;
        } else {
            return false;
        }
    }
});

