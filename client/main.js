import { Template } from 'meteor/templating';

//Modules
import '/imports/ui/client/wordcloud/wordcloud.html';
import '/imports/ui/client/whois/whois.html';
import '/imports/ui/client/logos/logos.html';
import '/imports/ui/client/testimonials/testimonials.html';

import '/imports/ui/client/wordcloud/helpers.js';
import '/imports/ui/client/whois/helpers.js';
import '/imports/ui/client/logos/helpers.js';
import '/imports/ui/client/testimonials/helpers.js';

import './main.html';
import { getWhoIs } from '/imports/api/client/whois/whois.js';
import { getWordCloud } from '/imports/api/client/wordcloud/wordcloud.js';
import { getLogos } from '/imports/api/client/logo/logo.js';
import { getTestimonials } from '/imports/api/client/testimonials/testimonials.js';
import { extractRootDomain , extractHostname } from '/imports/api/client/all/functions.js';

//npm modules
import scrollIntoView from 'scroll-into-view';


BlazeLayout.render('layout', {hi:'main'});

Template.content.helpers({
    websiteName(){
        let websiteName = Session.get('websiteName');
        return websiteName;
    },
});

Template.main.onRendered(function(){
    //Initialize materialize components
	$('select').material_select();
	$('ul.tabs').tabs();
    $('.carousel.carousel-slider').carousel({
        fullWidth: true,
        indicators: true
    });
});

Template.main.events({
  'submit .scrape-url'(event, instance){
    event.preventDefault();
    //Lock scrolling to hide created elements until render is complete
    //document.body.style.overflow = "hidden";
    window.scroll({
      top: 0, 
      left: 0, 
      behavior: 'smooth' 
    });

    const enteredUrl = (event.target.text.value).toLowerCase();
    const protocol = 'http://';
    let fullUrl;

    const host = extractHostname(enteredUrl);
    const domain = extractRootDomain(enteredUrl);
    // Meteor.call('getGoogleLinks', bareUrl, (err,result)=>{
    //     console.log(result);
    // });
    if(domain == enteredUrl){
        //Assume that url does not contain a subdomain
        fullUrl = protocol+'www.'+domain;
    } else {
        //Assume that url contains a subdomain
        fullUrl = protocol + host;
    }

    console.log(fullUrl);
    event.target.text.value = '';
    $('ul.tabs').tabs('select_tab', 'wordcloud');
    $('#preloader').removeClass('invisible');

    $("#url").prop('disabled', true);
    $("#search").addClass('disabled');

    //Clear all Session objects
    Session.clear();

    Meteor.call('checkForValidUrl',fullUrl,(err,result) => {
        if(err){
            console.error(err);
        }
        console.log(result);
        $("#url").prop('disabled', false);
        $("#search").removeClass('disabled');

        if(result == false){
            Materialize.toast('Unable to scan URL. Please check if the url entered is valid!', 4000);
             $('#preloader').addClass('invisible');
        } else {
            BlazeLayout.render('layout2', { top: "main",bot:"content"});

            //Make all preloaders visible
            $("#wordcloud-preloader").removeClass('invisible');
            $('#wordchart-preloader').removeClass('invisible');
            $("#whois-preloader").removeClass('invisible');
            $("#logos-preloader").removeClass('invisible');
            $("#testimonials-preloader").removeClass('invisible');

            //Temporarily disable wordcloud tabs
            $("#wordcloud-tab").addClass('disabled');
            $('#wordchart-tab').addClass('disabled');

            Session.set('websiteName',fullUrl);

            document.querySelector('#resultsBelow').scrollIntoView({ 
                behavior: 'smooth' 
            }); 

            scrollIntoView(document.querySelector('.initialWrapper'),function(type){

            });


            $('#preloader').addClass('invisible');
            //Disable input and show preloader while rendering
            // $("#url").prop('disabled', true);
            // $("#search").addClass('disabled');

            getWordCloud(fullUrl, ()=>{
                //Make all preloaders invisible
                $("#wordcloud-preloader").addClass('invisible');
                $('#wordchart-preloader').addClass('invisible');
                $("#wordcloud-tab").removeClass('disabled');
                $('#wordchart-tab').removeClass('disabled');

            });

            getWhoIs(domain, ()=>{
                //Make all preloaders invisible
                $("#whois-preloader").addClass('invisible');
            });
            getLogos(fullUrl, () =>{
                //Make all preloaders invisible
                $('#logos-preloader').addClass('invisible');    
            });

            getTestimonials(fullUrl, ()=>{
                //Make all preloaders invisible
                $("#testimonials-preloader").addClass('invisible');
                $('.collapsible').collapsible();
            });
        }
    });
  }
});