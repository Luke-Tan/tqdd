export function getLogos(url, render) {
    Meteor.call('scrapeLogos',url, function(err,result){
        console.log(result);
        Session.set('logos', result);
        if(render !== undefined){
            render();
        }
    });
}
