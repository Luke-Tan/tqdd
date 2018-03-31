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
    //Lock scrolling to hide created elements until render is complete
    document.body.style.overflow = "hidden";
    window.scroll({
      top: 0, 
      left: 0, 
      behavior: 'smooth' 
    });

    var bareUrl = event.target.text.value;
    const protocol = $('#protocol').find(":selected").val();
    let fullUrl;

    const domain = extractRootDomain(bareUrl);
    // Meteor.call('getGoogleLinks', bareUrl, (err,result)=>{
    //     console.log(result);
    // });
    if(domain == bareUrl){
        //Assume that url does not contain a subdomain
        bareUrl = 'www.'+bareUrl
        fullUrl = protocol+bareUrl;
    } else {
        //Assume that url contains a subdomain
        fullUrl = protocol + bareUrl;
    }

    event.target.text.value = '';
    $('ul.tabs').tabs('select_tab', 'wordcloud');

    Meteor.call('getUrls',fullUrl,bareUrl,(err,result) => {
        console.log(result);
        if(result == 'error'){
            Materialize.toast('Unable to scan URL. Please check if the url entered is valid!', 4000);
            document.body.style.overflow = "scroll"; 
        } else {
            BlazeLayout.render('layout2', { top: "main",bot:"content"});
            //Disable input and show preloader while rendering
            $("#url").prop('disabled', true);
            $("#search").addClass('disabled');
            $("#protocol").addClass('disabled');
            $('#preloader').removeClass('invisible');

            let urls = result;
            //console.log(urls);
            getWordCloud(urls, ()=>{
                //Re-enable scrolling
                document.body.style.overflow = "scroll";  
                //Re-enable input and hide preloader once render is complete
                $("#url").prop('disabled', false);
                $("#search").removeClass('disabled');  
                $('#preloader').addClass('invisible');
                //Scroll down to content to improve UX
                document.querySelector('.wordcloud-card').scrollIntoView({ 
                  behavior: 'smooth' 
                });     
            });
        }
    });
    getWhoIs(domain);
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

