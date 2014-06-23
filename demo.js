var hotplug = require("./index.js");

//console.log(hotplug.rawDeviceList()); // this is a long list :)

var deffile = "demoDefs.js";

hotplug.start({ hotplugDefs: deffile, verbose: false },function() {
	console.log("Loaded. Success.");
},function() {
	console.log("Error loading hotplugDefs. " + JSON.stringify(arguments));
});


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

