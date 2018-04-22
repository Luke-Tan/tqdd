//Modules
import './wordcloud.js';
import { extractRootDomain, extractName } from '../all/functions.js';


//npm dependancies
import gramophone from 'gramophone';
import renameKeys from 'rename-keys';
import sentiment from 'sentiment';
import nlp from 'compromise';
import NaturalLanguageUnderstandingV1 from 'watson-developer-cloud/natural-language-understanding/v1.js';

var nlu = new NaturalLanguageUnderstandingV1({
  'username': Meteor.settings.WATSON_USERNAME,
  'password': Meteor.settings.WATSON_PASSWORD,
  'version': '2018-03-16'
});

function countWords(s){
    s = s.replace(/(^\s*)|(\s*$)/gi,"");//exclude  start and end white-space
    s = s.replace(/[ ]{2,}/gi," ");//2 or more space to 1
    s = s.replace(/\n /,"\n"); // exclude newline with a start spacing
    return s.split(' ').length; 
}

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
					let freq = Math.ceil((weight**3)*65);
					cloudList.push({'text':text,'weight':freq})
				});

				//Include top 10 terms inside the wordchart
				for(i=0;i<11;i++){
					if(keywords[i] != undefined){
						let item = keywords[i];
						let text = item.text;
						let weight = item.relevance;
						let freq = Math.ceil((weight**3)*65);
						chartList.push({'text':text,'weight':freq});
					}
				}
				resolve([cloudList,chartList]);
			}
		});
    });
}

Meteor.methods({
	scrapeText(url){
		let cloudList = [];
		let chartList = [];
		// let allText = [];
		// let bigtext;
		// console.log(urls);
		// urls.forEach((url,index)=>{
		// 	const html = Scrape.website(url);
		// 	const text = html.text;
		// 	if(!allText.includes(text)){
		// 		allText.push(text);
		// 	} else {
		// 		console.log('hi');
		// 	}
		// });
		// allText.forEach((text,index)=>{
		// 	bigtext += text;
		// });
		let rootDomain = extractRootDomain(url);
		// console.log(rootDomain);
		//let websiteName = extractName(rootDomain);

		let params = {
		  'url': url,
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

		const result = analyze(params).await();

		return result;
	}
});
