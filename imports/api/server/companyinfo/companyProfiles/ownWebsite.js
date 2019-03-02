import request from 'request';
import cheerio from 'cheerio';
import nodeUrl from 'url';

function getOwnPageInfo(body){
	let $ = cheerio.load(body);
    $('br').each(function () {
        $(this).replaceWith(' ');
    });
    let phone = '';
    let address = '';
    let year = '';
    let email = [];

    $('*').not('script,style').each((index,element)=>{	
        let text;
        const childNodes = $(element).childNodes;
        if(Boolean(childNodes) != false){
            childNodes.forEach(child => {
                if (
                    child.type === 'tag' && 
                    child.prev.type === 'text' &&
                    child.prev.data.trim() !== '' && 
                    child.next.type === 'text' &&
                    child.next.data.trim() !== ''
                ) {
                    $(child).replaceWith($(child).text());
                }
            })
        }

        if($(element).children().length > 0){// If the element has children, only get the text of the element itself
            text = $(element).first().contents().filter(function() {
                return this.type === 'text';
            }).text().trim();	
            //
        } else {
            text = $(element).text().trim();		// Get text of the element
        } 

        //Phone RegExes
        const phoneRegEx1 = text.match(/\b\d{4} \d{4}\b/);	//Check for phone number of the format 9117 8830
        const phoneRegEx2 = text.match(/\b\d{8}\b/);			//Check for phone number of the format 91178830
        const phoneRegEx3 = text.match(/\+\d{10}/);			//Check for phone number of the format +6591178830

        //Address RegEx + Rules
        const addressRegEx = text.match(/\b[Ss]?\d{6}\b/);			//Check for address(postal code) of the format 268059, with an optional S or s in front
        //Year Founded RegEx + Rules						//Check for year founded of the format "Established ... 2019, Founded... 2019"
        const foundedRegEx = text.match(/\b\d{4}\b/);
        const foundedWords = ['founded','established','inception','incepted','created','creation','establishment','set'];
        
        //Email RegEx
        const emailRegEx = text.match(/(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/g);

        //Number of employees RegEx (experimental)
        //Empty

        if(text.length > 3){
        	//Check for Phone number
            if(phoneRegEx1 && phone == ''){
                phone = phoneRegEx1;
            } else if(phoneRegEx2 && phone == ''){
            	phone = phoneRegEx2;
            } else if(phoneRegEx3 && phone == ''){
            	phone = phoneRegEx3;
            }
        
        	//Check for Address
            if(addressRegEx && address == ''){
                const postalCodeIndex = text.indexOf(addressRegEx);
                const end = postalCodeIndex+6; //Postal code is 6 chars long
                const fullAddress = text.slice(0,end) //6 is the length of the postal code
                address = fullAddress;
            }
        
        	//Check for Year Founded
            if(foundedRegEx && year == ''){
                let sentences = text.split('.');
                let valid = false;
                for(let sentence of sentences){
                    for(let word of foundedWords){
                        if(sentence.toLowerCase().includes(word)){
                            valid = true;
                            year = text.match(/\b\d{4}\b/);
                            break
                        }
                    }
                    if(valid == true){
                        break
                    }
                }
            }

            //Check for Email
            if(emailRegEx){
                if(!email.includes(emailRegEx[0])){
                    email.push(emailRegEx[0])
                }
            }
        }

        //Break the loop when all fields are filled in
        if(year != '' && phone != '' && address == ''){
        	return false
        }
    });
	const companyDetails = {
        phone:phone,
        address:address,
        year:year,
        email:email
    }

    return companyDetails;
}

export default async function getOwnWebsiteInfo(fullUrl,body){
	let $ = cheerio.load(body);
	let companyInfoLinks = [];
	$('a').each(function(i, link){
		let href = $(link).attr('href');
		if(href !== undefined){
			const hrefLowerCase = href.toLowerCase();
			if(href[href.length -1] == '/'){
				href = href.slice(0, -1);
			}
			const link = nodeUrl.resolve(fullUrl,href);
			/* 
				Reject urls that contain a '#'' as it just points to the home page and we dont want to make excess queries
				Consider URLS that contain 'about us' or 'contact us' for places we may find valid info
			*/
			if(
				!(hrefLowerCase.includes('#')) && 
				!(companyInfoLinks.includes(link)) &&
				(link.includes('about') ||
				link.includes('contact'))
			) {
				companyInfoLinks.push(link);
			}
		}
	});
	let incomplete = false;
	let companyDetails = getOwnPageInfo(body);
	for(let key in companyDetails){
		if(companyDetails[key] == ''){
			incomplete = true;
			break;
		}
	}
	let promises = [];
	if(incomplete){
		companyInfoLinks.forEach(link=>{
			promises.push(new Promise((resolve,reject)=>{
				request(link,(err,resp,body)=>{
					if(err){
						reject(err)
                        return;
					}
					try{
						let companyDetails = getOwnPageInfo(body);
						resolve(companyDetails);
					}
					catch(err){
						console.error(err);
						resolve({});
					}
				})
			}))
		})
	}

    let companyInfoArray = await Promise.all(promises.map(p => p.catch(e => e)));

	for(let companyInfo of companyInfoArray) {
		for(let prop in companyInfo){
			if(companyDetails[prop] == ''){
				companyDetails[prop] = companyInfo[prop];
			}
		}
	}
	return companyDetails;
}