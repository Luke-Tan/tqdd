import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

//Modules
import './main.html';
import '/imports/ui/client/content.html';
import { getWhoIs } from '/imports/api/client/whois/whois.js';
import { getWordCloud } from '/imports/api/client/wordcloud/wordcloud.js';
import { getLogos } from '/imports/api/client/logo/logo.js';
import { stripToDomain , extractRootDomain } from '/imports/api/client/all/functions.js';

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
    window.scroll({
      top: 0, 
      left: 0, 
      behavior: 'smooth' 
    });

    const target = event.target;
    const bareUrl = target.text.value;
    const protocol = $('#protocol').find(":selected").val();
    //const www = 'www.';
    let fullUrl;
    //alert(fullUrl);
    //const fullUrl = protocol+www+url;
    // const partialUrl = protocol+url;
    //const domain = stripToDomain(fullUrl);
    const domain = extractRootDomain(bareUrl);
    console.log(domain);
    console.log(bareUrl);
    if(domain == bareUrl){
        //Assume that url does not contain a subdomain
        fullUrl = protocol+'www.'+bareUrl;
    } else {
        //Assume that url contains a subdomain
        fullUrl = protocol + bareUrl;
    }

    target.text.value = '';
    $('ul.tabs').tabs('select_tab', 'wordcloud');

    Meteor.call('getUrls',fullUrl,bareUrl,(err,result) => {
        console.log(result);
        if(result == 'error'){
            Materialize.toast('Unable to scan URL. Please check if the url entered is valid!', 4000);
            $("#url").prop('disabled', false);
            $("#search").removeClass('disabled');
            document.body.style.overflow = "scroll"; 
        } else {
            BlazeLayout.render('layout2', { top: "main",bot:"content"});
            $("#url").prop('disabled', true);
            $("#search").addClass('disabled');
            $("#protocol").addClass('disabled');
            $('#preloader').removeClass('invisible');
            let urls = result;
            //console.log(urls);
            getWordCloud(urls, ()=>{
                $('#preloader').addClass('invisible');
                document.body.style.overflow = "scroll";          
                $("#url").prop('disabled', false);
                $("#search").removeClass('disabled');  
                document.querySelector('.wordcloud-card').scrollIntoView({ 
                  behavior: 'smooth' 
                });     
            });
        }
    });
    getWhoIs(domain);
    //getWordCloud(fullUrl); 
    getLogos(fullUrl, () =>{
        // $('#preloader').addClass('invisible');
        // document.body.style.overflow = "scroll";        
    });
  }
});

Template.content.helpers({
    whoIsData(){
        return Session.get('whoisdata');
    },
    logos(){
        return Session.get('logos');
    },
    foundLogos(){
        if(Session.get('logos')==[] || Session.get('logos') == undefined){
            return false;
        } else {
            return true;
        }
    }
});

