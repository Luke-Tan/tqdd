import './wordcloud.js';

//npm dependancies
import gramophone from 'gramophone';
import renameKeys from 'rename-keys';

Meteor.methods({
	scrapeText(urls){
		var cloudList = [];
		var chartList = [];
		let allText;
		urls.forEach((url,index)=>{
			const html = Scrape.website(url);
			const text = html.text;
			allText += (text+ ' ');
		});
		// const html = Scrape.website(url);
		// console.log(html.references);
		// const text = html.text;
		const cloudwords = gramophone.extract(allText, { score:true, limit:60 });
		const chartwords = gramophone.extract(allText, { score:true, limit:10 });
		cloudwords.forEach((item,index)=>{
			const obj = renameKeys(item, (key,val) => {
				return val > 1 ? ('weight') : ('text');
			});
			cloudList.push(obj);
		});
		chartwords.forEach((item,index)=>{
			const obj = renameKeys(item, (key,val) => {
				return val > 1 ? ('weight') : ('text');
			});
			chartList.push(obj);
		});
		//console.log(list);
		return [cloudList,chartList];
	}
});
