export function getLogos(mainUrl, urls, render) {
    Meteor.call('scrapeLogos',mainUrl, urls, function(err,result){
        console.log(result);
        Session.set('logos', result);
        if(render !== undefined){
            render();
        }
    });
}
