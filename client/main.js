import { Template } from 'meteor/templating';

//Modules
import '/imports/ui/client/index.js';
import './main.html';

/* Internal modules */
import { getWhoIs } from '/imports/api/client/whois/whois.js';
import { getWordCloud } from '/imports/api/client/wordcloud/wordcloud.js';
import { getLogos } from '/imports/api/client/logo/logo.js';
import { getTestimonials } from '/imports/api/client/testimonials/testimonials.js';
import { getCompanyInfo } from '/imports/api/client/companyinfo/companyinfo.js'
import { getSocial } from '/imports/api/client/social/social.js';

import { extractRootDomain , extractHostname, getHostName, getDomain } from '/imports/api/client/all/functions.js';

//npm modules
import scrollIntoView from 'scroll-into-view';


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
    // $('input.autocomplete').autocomplete({
    //     Session.get('autocompleteData')
    // });
});

Template.main.events({
  'submit .scrape-url'(event){
    event.preventDefault();

    const enteredUrl = (event.target.text.value).toLowerCase();
    const protocol = 'http://';             // Use default protocol http 
    let fullUrl;
    console.log(enteredUrl);
    const host = extractHostname(enteredUrl);
    console.log(host);
    const domain = getDomain(enteredUrl);
    // Meteor.call('getGoogleLinks', bareUrl, (err,result)=>{
    //     console.log(result);
    // });
    if(domain == enteredUrl){               // Assume that url does not contain a subdomain
        fullUrl = protocol+'www.'+domain;
    } else {                                // Assume that url contains a subdomain
        fullUrl = protocol + host;
    }

    console.log(fullUrl);

    /* Initialize scraping */
    event.target.text.value = '';                       // Reset input bar after search
    $('ul.tabs').tabs('select_tab', 'wordcloud');       // Set the tab to the wordcloud to avoid problems with drawing of the wordcloud
    $('#preloader').removeClass('invisible');           // Show loading bar
    $("#url").prop('disabled', true);                   /* Temporarily disable input box until the search is complete */
    $("#search").addClass('disabled');                  /* Temporarily disable search button until the search is complete */    

    Session.clear();    //Clear all Session objects

    Meteor.call('checkForValidUrl',fullUrl,(err,result) => {    // Ping the website to check if it is a valid website to scrape
        if(err){
            console.error(err);
        }
        
        $("#url").prop('disabled', false);                      // Re-enable input box after ping
        $("#search").removeClass('disabled');                   // Re-enable search button after ping

        if(result == false){                                    // Error handling if the website is NOT able to be scraped
            Materialize.toast('Unable to scan URL. Please check if the url entered is valid!', 4000);
             $('#preloader').addClass('invisible');
        } else {
            BlazeLayout.render('layout2', { top: "main",bot:"content"});    // Render layout with contents below included

            // Make all preloaders visible
            $("#wordcloud-preloader").removeClass('invisible');
            $('#wordchart-preloader').removeClass('invisible');
            $("#whois-preloader").removeClass('invisible');
            $("#logos-preloader").removeClass('invisible');
            $("#testimonials-preloader").removeClass('invisible');
            $("#companyinfo-preloader").removeClass('invisible');
            $('#social-preloader').removeClass('invisible');

            // Temporarily disable wordcloud tabs to prevent issues
            $("#wordcloud-tab").addClass('disabled');
            $('#wordchart-tab').addClass('disabled');

            // Set the website name to display in the 'Results for website' Textbox
            Session.set('websiteName',fullUrl);

            // Scroll down to the results after the ping has completed
            document.querySelector('#resultsBelow').scrollIntoView({ 
                behavior: 'smooth' 
            }); 

            scrollIntoView(document.querySelector('.initialWrapper'),function(type){

            });


            $('#preloader').addClass('invisible');

            // getCompanyInfo(domain, ()=>{
            //     $('#companyinfo-preloader').addClass('invisible');
            // });

            // const social = {
            //     name:'ThunderQuote'
            //     mentions: '22,200',
            //     shares: { facebook: 1768, pinterest: 0, stumbles: 0 },
            //     news: { count: 0, articles: [] } 
            // }

            //Session.set('social',[social]);
            //$('#social-preloader').addClass('invisible');

            const locale = domain.slice(-2);
            let country;
            //This should be updated to contain an exhaustive list of ccTLDs. Note that some ccTLDs NEED to be excluded e.g. no one using .io is actually from the indian ocean
            if(locale == 'sg'){
                country = 'Singapore';
            } else if (locale == 'uk'){
                country = 'United Kingdom';
            } else {
                country = '';
            }

            Meteor.call('getName',fullUrl,domain,(err,result)=>{
                // Any module that requires the company name should be put in here
                const name = result

                getSocial(fullUrl,domain,name,country, ()=>{
                    console.log(name);
                    $('#social-preloader').addClass('invisible');
                })  
                // getCompanyInfo(domain,name,()=>{
                //     $('#companyinfo-preloader').addClass('invisible');
                // });
            })


            // const companyInfo = [{
            //     name:'Efusion Technology',
            //     year:'2002',
            //     employees:'0-9 Employees',
            //     address:'9a Kings Road Singapore',
            //     logo:'https://logo.clearbit.com/efusiontech.com',
            //     age:'10',
            //     phone:'04123041324'
            // }]

            // Session.set('companyInfo', companyInfo);
            // $('#companyinfo-preloader').addClass('invisible');

            // getWordCloud(fullUrl, ()=>{
            //     //Make all preloaders invisible
            //     $("#wordcloud-preloader").addClass('invisible');
            //     $('#wordchart-preloader').addClass('invisible');
            //     $("#wordcloud-tab").removeClass('disabled');
            //     $('#wordchart-tab').removeClass('disabled');

            // });

            // getWhoIs(domain, ()=>{
            //     //Make all preloaders invisible
            //     $("#whois-preloader").addClass('invisible');
            // });
            // getLogos(fullUrl, () =>{
            //     //Make all preloaders invisible
            //     $('#logos-preloader').addClass('invisible');    
            // });

            getTestimonials(fullUrl, ()=>{
                $("#testimonials-preloader").addClass('invisible'); // Make all preloaders invisible
                $('.collapsible').collapsible(); // Initialize the Materialize collapsible
            });

        }
    });
  }
});