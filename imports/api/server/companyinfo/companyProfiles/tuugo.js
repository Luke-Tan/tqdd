const request = require('request');
const cheerio = require('cheerio');
const nodeUrl = require('url')

export default function getTuugoInfo(name){
    return new Promise((resolve,reject)=>{
            const tuugoSearchUrl = `https://www.tuugo.sg/Search?search_type=company&search=+${name}`
                request(tuugoSearchUrl,(err,resp,body)=>{
                    if(err){
                        resolve({})
                    }
                    try{
                        let $ = cheerio.load(body);
                        let href = $('.item_lnk').first().attr('href')
                        let linkName = $('.item_lnk').first().text();
                        if(linkName.toLowerCase().includes(name.toLowerCase())){
                            let tuugoProfile = nodeUrl.resolve('https://www.tuugo.sg',href);
                            request(tuugoProfile,(err,resp,body)=>{
                                let $ = cheerio.load(body);
                                const phone = $('.company_phone').text().replace(/[a-zA-Z.]/g,'').trim();
                                const address = $('.address').text();
                                const companyProfile = {
                                    phone:phone,
                                    address:address
                                }
                                resolve(companyProfile);
                            })
                        } else {
                            resolve({});
                        }
                    }
                    catch(error){
                        console.error(error);
                        resolve({})
                    }
                })
        
    })
}
