// Template.hello.events({
//   'submit .scrape-url'(event) {
//     // Prevent default browser form submit
//     event.preventDefault();
 
//     // Get url from form element
//     const target = event.target;
//     const url = target.text.value;
 
//     target.text.value = '';

//     Meteor.call('whoIs', url, (err,result) => {
//         console.log(JSON.stringify(result));
//     });
//   },
// });

export function getWhoIs(url, render) {
    Meteor.call('whoIs', url, (err,result) => {
        const whoisdata=result;
        let whoisarray =[];
        let registrantArray = [];
        let adminArray = [];
        let techArray = [];
        let otherArray = []
        Object.entries(whoisdata).forEach(
            function([key,value]){
                //Transform camel cased key to normal text
                const text = key;
                const camelTextToNorm = text.replace( /([A-Z])/g, " $1" );
                const name = camelTextToNorm.charAt(0).toUpperCase() + camelTextToNorm.slice(1);
                if(value.includes('<')){
                    //Remove annoying <<< from the last entry of whois
                    value = value.slice(0,-4);
                }
                if(moment(value,"YYYY-MM-DD").isValid()==true && moment(value).isValid()==true){
                    value = moment(value).format('MMM Do YYYY');
                }
                // if(!name.toLowerCase().includes('registrar')){
                //     whoisarray.push({'name':name,'data':value});
                // }
                if(name.toLowerCase().includes('admin')){
                    adminArray.push({'name':name,'data':value});
                } else if(name.toLowerCase().includes('registrant')){
                    registrantArray.push({'name':name,'data':value});
                } else if(name.toLowerCase().includes('tech')){
                    techArray.push({'name':name,'data':value});
                } else if(!name.toLowerCase().includes('registrar')){
                    if(name != 'Domain Status'){
                        otherArray.push({'name':name,'data':value});
                    }
                }
            }
        );

        // const largest = Math.max(registrantArray.length,adminArray.length,techArray.length,otherArray.length);
        // const carouselHeight = largest*120;
        // $('.carousel-large').css('height',carouselHeight);

        Session.set('registrantData',registrantArray);
        Session.set('adminData',adminArray);
        Session.set('techData',techArray);
        Session.set('otherData',otherArray);
        render();
    });
}

//Registrant
//Admin
//Tech
//Other