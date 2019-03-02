//Modules
import './wordcloud.js';
import { getDomain } from '../all/functions.js';

//npm dependancies
import NaturalLanguageUnderstandingV1 from 'watson-developer-cloud/natural-language-understanding/v1.js';
import unfluff from 'unfluff';

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
				return;
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
					//Only include first 10 elements in the chart list
					if(index < 10){
						chartList.push({'text':text,'weight':freq});
					}
				});
				resolve({
					cloudList: cloudList,
					chartList: chartList
				})
			}
		});
    });
}

Meteor.methods({
	async scrapeText(url,body){
		let domain = getDomain(url);
		let result; 
		try{
			const params = {
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
			result = await analyze(params)
			return result;
		}
		catch(error){
			console.error(error)
			const data = unfluff(body);
			const text = data.text;
			const params = {
				'text': text,
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
			//If this still doesn't work for some reason, return empty cloudList and chartList
			result = await analyze(params).catch((err)=>{
				return {
					cloudList: [],
					chartList: []
				}
			});
			return result;
		}
	}
});
