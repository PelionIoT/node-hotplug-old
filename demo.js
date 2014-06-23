var hotplug = require("./index.js");
var util = require('util');
//console.log(hotplug.rawDeviceList()); // this is a long list :)

var deffile = "demoDefs.js";

hotplug.start({ hotplugDefs: deffile, verbose: true },function() {
	console.log("Loaded. Success.");

	hotplug.scanForDevices();	
},function() {
	console.log("Error loading hotplugDefs. " + JSON.stringify(arguments));
});


setInterval(function(){
	console.log("----------- CATALOG -----------------------------");
	console.log(util.inspect(hotplug.getCatalog()));
	console.log("----------- CATALOG END -------------------------");
},10000); // every 10 seconds



//var monitor = hotplug.monitor();
// monitor.on('add', function (device) {
//     console.log('added ' + JSON.stringify(device));
// //    monitor.close() // this closes the monitor.
// });
// monitor.on('remove', function (device) {
//     console.log('removed ' + device);
// });
// monitor.on('change', function (device) {
//     console.log('changed ' + device);
// });

