//Modules
import './wordcloud.js';
import { getDomain } from '../all/functions.js';

//npm dependancies
import NaturalLanguageUnderstandingV1 from 'watson-developer-cloud/natural-language-understanding/v1.js';

var nlu = new NaturalLanguageUnderstandingV1({
  'username': Meteor.settings.WATSON_USERNAME,
  'password': Meteor.settings.WATSON_PASSWORD,
  'version': '2018-03-16'
});

function analyze(params) {
    return new Promise((resolve, reject) => {
		nlu.analyze(params,(err,response)=>{
			if(err){
				reject(err);
			} else {
				let terms = [];
				let keywords = response.keywords;
				let concepts = response.concepts;
				terms.push(keywords);
				terms.push(concepts);
				//console.log(response.concepts);
				//console.log(keywords);
				let cloudList = [];
				let chartList = [];

				//Include all terms inside the wordcloud
				keywords.forEach((item,index)=>{
					let text = item.text;
					let weight = item.relevance;
					let freq = Math.ceil((weight**3)*40);
					cloudList.push({'text':text,'weight':freq})
				});

				//Include top 10 terms inside the wordchart
				for(i=0;i<11;i++){
					if(keywords[i] != undefined){
						let item = keywords[i];
						let text = item.text;
						let weight = item.relevance;
						let freq = Math.ceil((weight**3)*40);	// Make items with an already large weightage scale heigher, and a flat factor of 40 to increase weightage to all items
						chartList.push({'text':text,'weight':freq});
					}
				}
				
				resolve({
					cloudList: cloudList,
					chartList: chartList
				})
			}
		});
    });
}

Meteor.methods({
	async scrapeText(url){
		let domain = getDomain(url);

		let params = {
		  'url': domain,
		  'features': {
		    'keywords': {
		    	'sentiment': false,
		    	'emotion': false,
		    },
		    'concepts': {
		      'limit': 3
		    }
		  },
		  "language": "en",
		}

		const result = await analyze(params);

		return result;
	}
});
