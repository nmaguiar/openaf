//
// Author: nuno.aguiar@wedotechnologies.com

// Check the latest version
//
plugin("HTTP");

// VARIABLES
// ---------
var homeServerURLs = [
     "http://192.168.40.110/d/openaf/latest",
     "http://172.25.1.32/d/openaf/latest"
];
var updateURLs = [
     "http://192.168.40.110/d/openaf",
     "http://172.25.1.32/d/openaf"
];
var currentVersion = getVersion();

// FUNCTIONS
// ---------
function updateURL(pos, version) {
	return updateURLs[pos] + "/openaf-" + version + ".zip";
}

// MAIN
// ----

if (noHomeComms) {
	log("Check functionality has been disabled on this restricted release.");
	exit(0);
}

log("Checking current version");
log("Current version = " + currentVersion);

for(i in homeServerURLs) {
	var homeServerURL = homeServerURLs[i];
	log("Trying to contact OpenAF home server = '" + homeServerURL + "'");
	try {
		var homeServer = new HTTP(homeServerURL, undefined, undefined, undefined, false, 5000);
		var latestVersion = homeServer.response().trim();
		log("Latest version = " + latestVersion);
		
		if(latestVersion > currentVersion) {
			log("There is a newer version. Use the \"--update\" option or download it from " + updateURL(i, latestVersion));
		} else {
			log("This is an updated version. No update needed.");
		}
		break;
	} catch(e) {
		logErr("Can't contact OpenAF home server = '" + homeServerURL + "': " + e.message);
	}
}
	
log("Done checking current version");