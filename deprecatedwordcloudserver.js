		// //Only need 10 terms for the chart and 60 for the cloud, not trivial to 'trim' the result later
		// const cloudwords = gramophone.extract(allText, { score:true, limit:60, stem:true, cutoff:0.5, stopWords: [websiteName]});
		// const chartwords = gramophone.extract(allText, { score:true, limit:10, stem:true, cutoff:0.7});

		// cloudwords.forEach((item,index)=>{
		// 	let text = item.term;
		// 	let tf = item.tf;
		// 	// let weight = (item.tf);
		// 	// //Gives increased weightage to terms based on phrase length
		// 	// let termLength = countWords(item.term);
		// 	// //let termLengthWeight = termLength**termLength;
		// 	// weight = weight*(termLength);

		// 	// //Gives increased weightage to terms based on sentiment => Assumes that a good sentiment is a selling point
		// 	// let sentimentScore = (sentiment(item.term)).score;
		// 	// // console.log(text);
		// 	// // console.log(sentimentScore);
		// 	// if(sentimentScore >= 1){
		// 	// 	console.log(text);
		// 	// 	console.log(sentimentScore);
		// 	// 	weight = (weight)*(sentimentScore);
		// 	// }

		// 	// Push new object to array with modified weightage and key names 
		// 	// to suit the wordCloud and wordChart IF the length is greater than 2 chars


		// 	let totalweight;

		// 	let tfweight = (tf/100)*40;

		// 	let sentimentweight;

		// 	let sentimentScore = sentiment(text);
		// 	if(sentimentScore >= 1){
		// 		sentimentweight = sentimentScore * (20/3);
		// 	} else {
		// 		sentimentweight = 0;
		// 	}
		// 	let termLength = countWords(item.term);
		// 	let phraseweight = (20/3)*(termLength**0.5);
		// 	let tagweight;

		// 	totalweight = tfweight+sentimentweight+phraseweight;

		// 	let analyze = nlp(text);
		// 	let result = analyze.people().data();

		// 	//Check and exclude results that are 2 chars or less
		// 	//Check and excluse results that are people, by checking if result is an empty array
		// 	if(text.length > 2 && result[0] == undefined){
		// 		// const obj = renameKeys(item, (key,val) => {
		// 		// 	return val > 1 ? ('weight') : ('text');
		// 		// });
		// 		const renamedObj = {'text':text, 'weight':totalweight};
		// 		cloudList.push(renamedObj);
		// 	}
		// });

		// chartwords.forEach((item,index)=>{
		// 	let text = item.term;
		// 	let weight;
		// 	//Gives increased weightage to terms based on phrase length
		// 	let termLength = countWords(item.term);
		// 	weight = (item.tf)*(termLength);

		// 	//Gives increased weightage to terms based on sentiment => Assumes that a good sentiment is a selling point
		// 	let sentimentScore = sentiment(item.term);
		// 	if(sentimentScore >= 1){
		// 		weight = (weight)*sentimentScore;
		// 	}

		// 	// Push new object to array with modified weightage and key names 
		// 	// to suit the wordCloud and wordChart IF the length is greater than 2 chars
		// 	if(text.length > 2){
		// 		// const obj = renameKeys(item, (key,val) => {
		// 		// 	return val > 1 ? ('weight') : ('text');
		// 		// });
		// 		const renamedObj = {'text':text, 'weight':weight};
		// 		chartList.push(renamedObj);
		// 	}
		// });