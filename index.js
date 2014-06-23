/**
 * WigWag Inc. (c) 2014
 *
 * node-hotplug
 *
 * multi-platform hotplug interface for inserted / attached devices
 */

var EventEmitter = require('events').EventEmitter;
var OS = require('os');
var FS = require('fs');
var util = require('util');
var uuid = require('node-uuid');
var Tree = require('./signatureTree');

var detectOS = function() {
	var platform = OS.platform();
	if (/^linux/.test(platform))
		return 'linux';
	else
		return 'notsupportedyet';
	// console.log("platform: " + OS.platform());
	// console.log("type: " + OS.type());
	// console.log("release: " + OS.type());
	// console.log("arch: " + OS.arch());
}

var platform = detectOS();

module.exports = {}

var seenDevices = {};
var deviceTable = []; // pulled from a file, or an array handed
var deviceIndex = {}; // built from file import
var options = {};

var signatureTree = new Tree();
var sortedFields = [];

var mergeOptionsIn = function(obj) {
	for (var attrname in obj) { options[attrname] = obj[attrname]; }
}

var loadDeviceTable = function(path, successcb, errorcb) {
	var table = null;
	var realpath = path;

	var cwd = process.cwd();

	var exists = FS.existsSync(realpath);
	var stat = null;
	if(exists) stat = FS.statSync(realpath);
	if(!exists || !stat || !stat.isFile()) {
		realpath = "./" + realpath;
		exists = FS.existsSync(realpath);
		if(exists) stat = FS.statSync(realpath);
		if(!exists || !stat || !stat.isFile()) {
			errorcb("Could not find file: " + path);
			return false;
		}
	} else 
	    realpath = cwd + '/' + realpath;
	try {
		table = require(realpath);
		if(typeof table !== 'object') {
			errorcb("Exports from " + realpath + " did not return an object.");
			return false;
		}
	} catch(e) {
		errorcb("Error on require() of device table: " + e.message + " --> " + e.stack);
		return false;
	}
	successcb(table);
	return true;
} 

// initialize based on OS...

if(platform == 'linux') {
///////////////////////////////////////////// LINUX

	var udev = require('./build/Release/udev');
	udev.Monitor.prototype.__proto__ = EventEmitter.prototype;

	// module.exports.monitor = function() { 
	// 	return new udev.Monitor(); 
	// };


	var _onAdd = function (device) {
		if(options.verbose) {
			console.log("Detected new device.");
			console.log('Info: ' + util.inspect(device));
		}

	    var path = [];
	    for(var s=0;s<sortedFields.length;s++) {
//	    	console.log("signature: " + util.inspect(device));
//	        console.log("relevant field " + sortedFields[s][0] + " = " + device[sortedFields[s][0]]);
	    	path.push([sortedFields[s][0],device[sortedFields[s][0]]]);
	    }
//	    console.log("items for new fields: " + util.inspect(path));

	    var ret = signatureTree.lookup(path);
	    if(ret) {
	    	if(options.verbose)
	    		console.log("Definition with matching signature found: (" + ret + ") " + deviceIndex[ret].name);
	    }

	    if(deviceIndex[ret]) {
	    	var uuid = null;
	    	try {
	    		uuid = deviceIndex[ret].onSeen(device,{
	    			platform: platform
	    		});
	    	} catch (e) {
	    		console.error("Error in handler for device: " + uuid + " --> " + e.message + e.stack);
	    	}

	    	if(uuid) {
	    		if(!seenDevices[uuid]) {
	    			seenDevices[uuid] = device;
	    			try {
	    				deviceIndex[ret].onNew(device,uuid,{
	    					platform: platform
	    				});
	    			} catch (e) {
	    				console.error("Error in handler for device: " + uuid + " --> " + e.message + e.stack);
	    			}
	    		}
	    	} else {
	    		console.error("WARN: onSeen() for device returned a " + (typeof uuid));
	    	}
	    }
	}

	var _onRemove = function (device) {
		console.log('removed ' + device);
	}

	var _onChange = function (device) {
		console.log('changed ' + device);
	}

	/**
	 * @method  start
	 * @param  {[type]} options Of the format: <code>
	 * {
	 *     hotplugDefs: "somefile-file-path", // should be a JavaScript file which exports an Array of objects of 'hotplug_hook' (see below)
	 *     verbose: true                      // be chatty on the console (good for debugging)
	 * }
	 * a hotplug_hook object looks like:
	 * {
	 *     name: "USB device",
	 *     signature: {  // one or more keys to look for in hotplug data. All keys must match. Can be value or regex
	 *           "ID_SERIAL" : "FTDI_FT232R_USB_UART_A901M8MU",
	 *           "SOME_field" : /^FTDI.*L/                         // can also have RegExs   
	 *     },
	 *     description: "optional stuff", // optional
	 *     onSeen: function(hotplugdata,info) {  // called when a new device is seen, coming in or leaving (note, this may mean the device is already added / dealt with)
	 *         console.log("This is info on the newly attached device: " + JSON.stringify(hotplugdata));
	 *         console.log("This is platform: " + info.platform); 
	 *         return "uniqueid-for-this-device"; // return a string which is unique to this device. If this device is unplugged, and plugged
	 *                                            // back in, this string should be the same
	 *     },
	 *     onNew: function(hotplugdata,info){
	 *         console.log("I am truly a new device!! Do something to get me working.");
	 *     }
	 *     onRemove: function(hotplugdata, info) {
	 *         console.log("This is info on the removed device: " + JSON.stringify(hotplugdata));
	 *     },
	 *     onChange: function(hotplugdata_before, hotplugdata_after, info) {
	 *         console.log("This is info on the changed device: " + JSON.stringify(hotplugdata));
	 *     }
	 * }
	 * @return {[type]}         [description]
	 */
	module.exports.start = function(opts,successcb,failurecb) {

		var _monitor = new udev.Monitor(); 

		var success = false;

		mergeOptionsIn(opts);

		if(options && options.hotplugDefs) {
			if(typeof options.hotplugDefs === 'string') {
				loadDeviceTable(options.hotplugDefs,function(table){
					deviceTable = table;
					console.log("device table------------");
					console.log(util.inspect(deviceTable));
					success = true;
				},function(err){
					success = false;
					failurecb(err);
				});
			} else if (typeof options.hotplugDefs === 'object') {
				deviceTable = table;
			} else {
				success = false;
				failurecb("Invalid hotplugDefs value. Need file name or object.");
			}
		}

		var signatureFields = {};

		if(success) {
		    for(var n=0;n<deviceTable.length;n++) { // loop through all the entries, make a count of which fields they use.
		    	if(typeof deviceTable[n] === 'object' && deviceTable[n].name && deviceTable[n].signature) {
		    		deviceIndex[uuid.v1()] = deviceTable[n];
		    		var keys = Object.keys(deviceTable[n].signature);
		    		for(var k=0;k<keys.length;k++) {
		    			if(!signatureFields[keys[k]]) signatureFields[keys[k]] = 1;
		    			else signatureFields[keys[k]]++;
		    		}
		    	} else {
		    		if(deviceTable[n].name)
		    			console.error("Entry for <" + deviceTable[n].name + "> has no signature info.");
		    		else
		    			console.error("Bad entry in hotplug definitions");
		    	}
		    }

		    var fieldnames = Object.keys(signatureFields); // sort based on number of field counts...
		    for(var n=0;n<fieldnames.length;n++)
		    	sortedFields.push([fieldnames[n], signatureFields[fieldnames[n]]])
		    sortedFields.sort(function(a, b) {return a[1] - b[1]})

		    console.log("Fields in order: " + util.inspect(sortedFields));

		    var devids = Object.keys(deviceIndex);
		    for(var devn=0;devn<devids.length;devn++) {
		    	var path = [];
		    	for(var s=0;s<sortedFields.length;s++) {
//		    		console.log("signature: " + util.inspect(deviceIndex[devids[devn]].signature));
		    		path.push([sortedFields[s][0],deviceIndex[devids[devn]].signature[sortedFields[s][0]]]);
		    	}
		    	console.log("ADD item <" + devids[devn] + "> path: " + util.inspect(path));
		    	signatureTree.add(path,devids[devn]);
		    }

		}

		if(success) {
			_monitor.on('add', _onAdd );
			_monitor.on('remove', _onRemove );
			_monitor.on('change', _onChange );
			successcb();
///////////
			// console.log("test.....");

			// var lookup = [ [ 'ID_SERIAL', 'SanDisk_Cruzer_Glide_20044320321D5F9254FE-0:0' ],
			// [ 'ID_MODEL_FROM_DATABASE', undefined ],
			// [ 'ID_MODEL_ENC', 'Cruzer\\x20Glide\\x20\\x20\\x20\\x20' ],
			// [ 'ID_MODEL', 'Cruzer_Glide' ],
			// [ 'ID_BUS', 'usb' ] ];

			// console.log("Lookup: " + util.inspect(lookup));
   //          var ret = signatureTree.lookup(lookup);

   //          if(ret)
   //          {
   //          	console.log("Found it. " + ret);
   //          } else
   //          console.log("not found.");
///////////////
		} else {
			failurecb("No hotplugDefs.");
		}
	}

	/**
	 * Shutdowns the hotplug service.
	 * @return {[type]} [description]
	 */
	module.exports.stop = function() {
		_monitor.removeListener('add',_onAdd);
		_monitor.removeListener('remove',_onRemove);
		_monitor.removeListener('change',_onChange);
	}

	/**
	 * @method rawDeviceList
	 * @return {object} returns a javascript object with a list of raw information on attached devices. OS-specific
	 */
    module.exports.rawDeviceList = udev.list;

////////////////////////////////////////////
} else {
//////////////////////////////////////////// UNSUPPORTED

	module.exports.start = function(options) {
		console.log("platform " + platform + " currently unsupported!!!");
	}

	module.exports.stop = function() {
		console.log("platform " + platform + " currently unsupported!!!");
	}


    module.exports.rawDeviceList = function() { return {} };
////////////////////////////////////////////
}

