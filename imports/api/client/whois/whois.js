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

export function getWhoIs(url) {
    Meteor.call('whoIs', url, (err,result) => {
        let whoisdata=result;
        let whoisarray =[];
        Object.entries(whoisdata).forEach(
            function([key,value]){
                //Transform camel cased key to normal text
                let text = key;
                let camelTextToNorm = text.replace( /([A-Z])/g, " $1" );
                let name = camelTextToNorm.charAt(0).toUpperCase() + camelTextToNorm.slice(1);
                whoisarray.push({'name':name,'data':value});
            }
        );
        Session.set('whoisdata',whoisarray);
    });
}