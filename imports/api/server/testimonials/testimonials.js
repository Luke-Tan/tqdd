import natural from 'natural';
import Future from 'fibers/future';
import cheerio from 'cheerio';
import request from 'request';
import nodeurl from 'url';
import nlp from 'compromise';
import { testimonialData, plainData } from './trainingdata.js';

var bayes = new natural.BayesClassifier();
//var logistic = new natural.LogisticRegressionClassifier();

testimonialData.forEach((testimonial)=>{
	bayes.addDocument(testimonial,'testimonial');
	//logistic.addDocument(testimonial,'testimonial');
});

plainData.forEach((doc)=>{
	bayes.addDocument(doc,'plain');
	//logistic.addDocument(doc,'plain');
});

bayes.train();

function checkAuthor(text){
	let doc = nlp(text);
	let people = doc.people().data();
	if(text.length <100 && 0<people.length && people.length<4){
		return true;
	} else {
		return false;
	}
}

Meteor.methods({
	getTestimonials(url){

		let testimonials = [];
		let future = new Future();
		request(url, (err,resp,body)=>{

			let $ = cheerio.load(body);
			let links = $('a');
			let texts = $('p');
			let testimonialLinks = [];
			//testimonialLinks.push(url);

			$(links).each(function(i, link){
				let href = $(link).attr('href');
				if(href != undefined){
					if(href.includes('testimonial') && !(href.includes('#'))){
						let link = nodeurl.resolve(url,href);
						testimonialLinks.push(link);
					}
				}
			});

			console.log(testimonialLinks);
			let vetos = [];

			function checkTestimonial(p, testimonial){
				let author;
				let text = p.text();
				let result = bayes.classify(text);
				if( (result == 'testimonial' && text.length > 100) || checkAuthor(p.next().text()) ){
					//console.log(text);
					testimonial += text;
					vetos.push(text);
					let next = p.next();
					return checkTestimonial(next, testimonial);
				} else {
					//console.log(testimonial);
					if(testimonial != ''){
						author = p.text();
						return {'text':testimonial,'author':author};
					} else {
						return '';
					}

				}
			}


			$(texts).each(function(i, text){
				let rawtext = $(text).text();
				if(checkAuthor(rawtext)){
					$(text).addClass('author');
				}
			});

			$(texts).each(function(i, text){
				if(!(vetos.includes($(text).text()))){
					if(checkTestimonial($(text),'') != ''){
						testimonials.push(checkTestimonial($(text),''));
					}
				} 
			});

			testimonialLinks.forEach(link=>{
				request(link,(err,resp,body)=>{
					//console.log(body);
					let $ = cheerio.load(body);
					let texts = $('p');
					$(texts).each(function(i, text){
						let rawtext = $(text).text();
						if(checkAuthor(rawtext)){
							$(text).addClass('author');
						}
					});

					$(texts).each(function(i, text){
						if(!(vetos.includes($(text).text()))){
							if(checkTestimonial($(text),'') != ''){
								testimonials.push(checkTestimonial($(text),''));
							}
						} 
					});
				});
			});
			future["return"](testimonials);
		});
		return future.wait();
	}
});



