var fs = require("fs");
var http = require("http");
var https = require("https");
var path = require("path");
var url = require("url");
var events = require("events").EventEmitter;
var util = require("util");

var cheerio = require("cheerio");

// The "Image" class.
function Image(image, address){

	var at = this.attributes = image.attribs;

	if(at.src != undefined){
		this.name = path.basename(at.src, path.extname(at.src));
		//this.saveTo = path.dirname(require.main.filename) + "/";
		this.extension = path.extname(at.src);
		this.address = url.resolve(address, at.src);
		this.fromAddress = address;
	} else {
		this.name = path.basename(at['data-cfsrc'], path.extname(at['data-cfsrc']));
		//this.saveTo = path.dirname(require.main.filename) + "/";
		this.extension = path.extname(at['data-cfsrc']);
		this.address = url.resolve(address, at['data-cfsrc']);
		this.fromAddress = address;		
	}
}

Image.prototype.save = function(callback){

	var parsedUrl = url.parse(this.address);

	// Make a reference to the current instance.
	var ref = this;

	// Support HTTPS.
	var protocol = http;
	if(parsedUrl.protocol == "https:") {
		protocol = https;
	}

	var request = protocol.request(this.address, function(response){

		if(response.statusCode != 200){

			console.error("Image scraper(3): image couldn't be found. (statusCode:" + response.statusCode + ")");
			return request.end();
		}
		else{

			var imageFile = fs.createWriteStream(path.normalize(ref.saveTo + ref.name + ref.extension));

			imageFile.on("error", function(e){

				console.error("Image scraper(4): error while loading image: " + e + ".");
			});

			response.on("data", function(data){

				imageFile.write(data);
			});

			response.on("end", function(){

				imageFile.end();

				if(typeof(callback) == "function") callback.call(ref);
			});
		}
	});

	request.end();
	request.on("error", function(e){

		console.error(e);
	});
};

function Scraper(address){

	events.call(this);
	this.address = address;
}

// Inherit the methods of "events".
util.inherits(Scraper, events);

Scraper.prototype.scrape = function(callback){

	if(typeof(callback) == "function"){

		this.on("image", callback);
	}

	var parsedUrl = url.parse(this.address);

	// Make a reference to the current instance.
	var ref = this;

	// Support HTTPS.
	var protocol = http;
	if(parsedUrl.protocol == "https:") {
		protocol = https;
	}
	console.log(this.address);
	var request = protocol.request(this.address, function(response){

		if(response.statusCode != 200){
			console.error("Image scraper(1): web page couldn't be found. (statusCode:" + response.statusCode + ")");
			//console.log(response);
			ref.emit("end");
			request.end();
			//return process.exit(1);
		}
		else{

			response.setEncoding("utf8");

			var previous = "",
				current;

			response.on("data", function(data){
				var current = previous + data;

				//console.log(data);

				current.replace(/<img[\S\s]*?>/ig, function(m){

					var image = new Image(cheerio.load(m)("img")[0], ref.address);
					//console.log(image);
					ref.emit("image", image);
				});

				previous = data;
			});

			response.on("end", function(){
				ref.emit("end");
			});
		}
	});
	request.end();

	request.on("error", function(e){
		console.error("Image scraper(2): error while loading web page: " + e + ".");
	});
};

Scraper.prototype.scrapeAsync = function(ms) {
    let ref = this; // same coding style as in existing methods.
    let images = [];
    return new Promise(function(resolve, reject) {
        ref.on('image', (image) => { 
        	if(images.indexOf(image.address == -1)){
        		//images.push({address:image.address, width:image.attributes.width, height:image.attributes.height});
        		images.push(image.address);
        	}
        });
        ref.on('end', () => { resolve(images) });
        // ref.on('error', reject); // unfortunately image-scraper doesn't emit an 'error' event.
        if(ms !== undefined) { // maybe timeout as substitute for error handler?
            setTimeout(function() {
                reject(`image-scraper timed out after ${ms} ms`);
            }, ms);
        }
        ref.scrape();
    });
}

module.exports = Scraper;