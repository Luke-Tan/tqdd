/* Functions to parse URL */
export function domainToName(url) {
    while(url.indexOf('.') != -1){
        url = url.substring(0, url.lastIndexOf("."))
    }
    return url;
}

export function getDomain(url) {
    var hostName = extractHostname(url);
    var domain = hostName;
    
    if (hostName != null) {
        var parts = hostName.split('.').reverse();
        
        if (parts != null && parts.length > 1) {
            domain = parts[1] + '.' + parts[0];
                
            if (hostName.toLowerCase().indexOf('.co.uk') != -1 && parts.length > 2) {
              domain = parts[2] + '.' + domain;
            }
            if (hostName.toLowerCase().indexOf('.com.sg') != -1 && parts.length > 2) {
              domain = parts[2] + '.' + domain;
            }
        }
    }
    
    return domain;
}

export function extractHostname(url) {
    var hostname;
    //find & remove protocol (http, ftp, etc.) and get hostname

    if (url.indexOf("://") > -1) {
        hostname = url.split('/')[2];
    }
    else {
        hostname = url.split('/')[0];
    }

    //find & remove port number
    hostname = hostname.split(':')[0];
    //find & remove "?"
    hostname = hostname.split('?')[0];

    return hostname;
}

/* Fuzzy match algorithm */
export function fuzzyMatch(needle, haystack) {
    if(needle === "" || haystack === "") return true;

    needle = needle.toLowerCase().replace(/ /g, "");
    haystack = haystack.toLowerCase();

    // All characters in needle must be present in haystack
    var j = 0; // haystack position
    for(var i = 0; i < needle.length; i++) {
        // Go down the haystack until we find the current needle character
        while(needle[i] !== haystack[j]) {
            j++;

            // If we reached the end of the haystack, then this is not a match
            if(j === haystack.length) {
                return false;
            }
        }

        // Here, needle character is same as haystack character
        //console.log(needle + ":" + i + " === " + haystack + ":" + j);
    }

    // At this point, we have matched every single letter in the needle without returning false
    return true;
}

/*Get all indexes of something in an array*/
export function getAllIndexes(arr, val) {
    let indexes = [], i;
    for(i = 0; i < arr.length; i++)
        if (arr[i].type === val)
            indexes.push(i);
    return indexes;
}