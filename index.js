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


var _overrideOnNewCB = null;
var _overrideOnRemoveCB = null;
var _overrideOnChangeCB = null;

var detectOS = function() {
	var platform = OS.platform();
	if (/^linux/.test(platform))
		return 'linux';
	else
		return 'notsupportedyet';
	logHotplugInfo("platform: " + OS.platform());
	logHotplugInfo("type: " + OS.type());
	logHotplugInfo("release: " + OS.type());
	logHotplugInfo("arch: " + OS.arch());
}

var logHotplugError = function() {	
	var p = Array.prototype.slice.apply(arguments);
	p.unshift("node-hotplug: ");
	console.error.apply(console,p);
}

var logHotplugInfo = function() {
	var p = Array.prototype.slice.apply(arguments);
	p.unshift("node-hotplug: ");
	console.info.apply(console,p);
}


var platform = detectOS();

module.exports = {}

var catalogedDevices = {};
var deviceTable = []; // pulled from a file, or an array handed
var deviceIndex = {}; // built from file import
var options = {};

var signatureSets = [];

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
			if(options.verbose) logHotplugError("Could not find file: " + path);
			return false;
		}
	} else if (realpath.charAt(0) != '/') {
	    realpath = cwd + '/' + realpath;
	}
	try {
		table = require(realpath);
		if(typeof table !== 'object') {
			errorcb("Exports from " + realpath + " did not return an object.");
			if(options.verbose) logHotplugError("Exports from " + realpath + " did not return an object.");
			return false;
		}
	} catch(e) {
		if(options.verbose) logHotplugError("Error on require() of device table: " + e.message + " --> " + e.stack);
		errorcb("Error on require() of device table: " + e.message + " --> " + e.stack);
		return false;
	}
	successcb(table);
	return true;
} 

// initialize based on OS...

if(platform == 'linux') {
///////////////////////////////////////////// LINUX
	var udev = require('./build/Release/udev.node');
	udev.Monitor.prototype.__proto__ = EventEmitter.prototype;

	// module.exports.monitor = function() { 
	// 	return new udev.Monitor(); 
	// };


	var _onUdevAdd = function (device) {
		if(options.verbose) {
			logHotplugInfo("Detected new device.");
			logHotplugInfo('Info: ' + util.inspect(device));
		}

	    var path = [];
	    for(var s=0;s<sortedFields.length;s++) {
//	    	logHotplugInfo("signature: " + util.inspect(device));
	        logHotplugInfo("relevant field " + sortedFields[s][0] + " = " + device[sortedFields[s][0]]);
	    	path.push([sortedFields[s][0],device[sortedFields[s][0]]]);
	    }
//	    logHotplugInfo("items for new fields: " + util.inspect(path));

	    var ret = signatureTree.lookup(path);
	    if(ret) {
	    	if(options.verbose)
	    		logHotplugInfo("Add: Definition with matching signature found: (" + ret + ") " + deviceIndex[ret].name);
	    }


	    if(deviceIndex[ret]) {
	    	var sigset = deviceIndex[ret].sigset;
	    	var uuid = null;
	    	try {
	    		uuid = deviceIndex[ret].onSeen(device,{
	    			platform: platform
	    		},signatureSets[sigset]);
	    	} catch (e) {
	    		logHotplugError("Error in onSeen() handler for device: " + uuid + " --> " + e.message + e.stack);
	    	}

	    	if(uuid) {
	    		if(!catalogedDevices[uuid]) {
	    			catalogedDevices[uuid] = device;
	    			try {
 	    				if(_overrideOnNewCB)
	    					_overrideOnNewCB.call(undefined,deviceIndex[ret],catalogedDevices[uuid],uuid,{
	    						platform: platform },signatureSets[sigset]);
	    				else
	    					deviceIndex[ret].onNew(catalogedDevices[uuid],uuid,{
	    						platform: platform
	    					},signatureSets[sigset]);
	    			} catch (e) {
	    				logHotplugError("Error in onNew() handler for device: " + uuid + " --> " + e.message + e.stack);
	    			}
	    		}
	    	} else {
	    		logHotplugError("WARN: onSeen() for device returned a " + (typeof uuid));
	    	}
	    }
	}

	var _onUdevRemove = function (device) {
		if(options.verbose) {
			logHotplugInfo("Detected removed device.");
			logHotplugInfo('Info: ' + util.inspect(device));
		}
	    
	    var path = []; // build lookup path
	    for(var s=0;s<sortedFields.length;s++) {
	    	path.push([sortedFields[s][0],device[sortedFields[s][0]]]);
	    }

	    var ret = signatureTree.lookup(path);
	    if(ret) {
	    	if(options.verbose)
	    		logHotplugInfo("Remove: Definition with matching signature found: (" + ret + ") " + deviceIndex[ret].name);
	    }
	    if(deviceIndex[ret]) {
	    	var uuid = null;
	    	try {
	    		uuid = deviceIndex[ret].onSeen(device,{
	    			platform: platform
	    		});
	    	} catch (e) {
	    		logHotplugError("Error in handler for device: " + uuid + " --> " + e.message + e.stack);
	    	}

	    	if(uuid) {
	    		if(catalogedDevices[uuid]) {
	    			try {
	    				var sigset = deviceIndex[ret].sigset;
	    				if(_overrideOnRemoveCB)
	    					_overrideOnRemoveCB.call(undefined,deviceIndex[ret],catalogedDevices[uuid],uuid,{
	    					platform: platform },signatureSets[sigset]);
	    				else
	    					deviceIndex[ret].onRemove(catalogedDevices[uuid],uuid,{
	    						platform: platform
	    					},signatureSets[sigset]);
	    			} catch (e) {
	    				logHotplugError("Error in onRemove() handler for device: " + uuid + " --> " + e.message + e.stack);
	    			}
	    			if(options.verbose)
	    				logHotplugInfo("Removing uuid:"+uuid+" from table.");
	    			delete catalogedDevices[uuid];
	    		}
	    	} else {
	    		logHotplugError("WARN: onSeen() for device returned a " + (typeof uuid));
	    	}
	    }




	}

	var _onUdevChange = function (device) {
		if(options.verbose) {
			logHotplugInfo("Detected change on device.");
			logHotplugInfo('Info: ' + util.inspect(device));
		}
	    
	    var path = []; // build lookup path
	    for(var s=0;s<sortedFields.length;s++) {
	    	path.push([sortedFields[s][0],device[sortedFields[s][0]]]);
	    }

	    var ret = signatureTree.lookup(path);
	    if(ret) {
	    	if(options.verbose)
	    		logHotplugInfo("Change: Definition with matching signature found: (" + ret + ") " + deviceIndex[ret].name);
	    }
	    if(deviceIndex[ret]) {
	    	var uuid = null;
	    	try {
	    		uuid = deviceIndex[ret].onSeen(device,{
	    			platform: platform
	    		});
	    	} catch (e) {
	    		logHotplugError("Error in handler for device: " + uuid + " --> " + e.message + e.stack);
	    	}

	    	if(uuid) {
	    		if(catalogedDevices[uuid]) {
	    			var olddata = catalogedDevices[uuid];
	    			catalogedDevices[uuid] = device;
	    			try {
	    				var sigset = deviceIndex[ret].sigset;
	    				if(_overrideOnChangeCB)
	    					_overrideOnChangeCB.call(undefined,olddata,deviceIndex[ret],catalogedDevices[uuid],uuid,{
	    					platform: platform },signatureSets[sigset]);
	    				else
	    					deviceIndex[ret].onChange(olddate,catalogedDevices[uuid],uuid,{
	    						platform: platform
	    					},signatureSets[sigset]);
	    				// deviceIndex[ret].onChange(olddata,catalogedDevices[uuid],uuid,{
	    				// 	platform: platform
	    				// });
	    			} catch (e) {
	    				logHotplugError("Error in onChange() handler for device: " + uuid + " --> " + e.message + e.stack);
	    			}
	    			if(options.verbose)
	    				logHotplugInfo("Removing uuid:"+uuid+" from table.");
	    		}
	    	} else {
	    		logHotplugError("WARN: onSeen() for device returned a " + (typeof uuid));
	    	}
	    }


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
//					deviceTable = table;
	                deviceTable = [];
					for(var n=0;n<table.length;n++) {  // mash arrays into single dim array
						if(util.isArray(table[n])) {
							for(var z=0;z<table[n].length;z++) {
								logHotplugInfo("Adding entry (2): " + table[n][z].name);
								deviceTable.push(table[n][z]);
							}
						} else {
							logHotplugInfo("Adding entry: " + table[n].name);
						    deviceTable.push(table[n]);
						}
					}
					if(options.verbose) {
						logHotplugInfo("device table------------");
						logHotplugInfo(util.inspect(deviceTable));
					}
					for(var n=0;n<deviceTable.length;n++) {
						if(deviceTable[n].sigset) { // create signature set objects
							console.log("Found sigset: " + deviceTable[n].sigset); 
							signatureSets[deviceTable[n].sigset] = {};
						}
					}
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
		    			logHotplugError("Entry for <" + deviceTable[n].name + "> has no signature info.");
		    		else
		    			logHotplugError("Bad entry in hotplug definitions");
		    	}
		    }

		    var fieldnames = Object.keys(signatureFields); // sort based on number of field counts...
		    for(var n=0;n<fieldnames.length;n++)
		    	sortedFields.push([fieldnames[n], signatureFields[fieldnames[n]]])
		    sortedFields.sort(function(a, b) {return a[1] - b[1]})

//		    logHotplugInfo("Fields in order: " + util.inspect(sortedFields));

		    var devids = Object.keys(deviceIndex);
		    for(var devn=0;devn<devids.length;devn++) {
		    	var path = [];
		    	for(var s=0;s<sortedFields.length;s++) {
//		    		logHotplugInfo("signature: " + util.inspect(deviceIndex[devids[devn]].signature));
		    		path.push([sortedFields[s][0],deviceIndex[devids[devn]].signature[sortedFields[s][0]]]);
		    	}
		    	if(options.verbose) logHotplugInfo("ADD item <" + devids[devn] + "> path: " + util.inspect(path));
		    	signatureTree.add(path,devids[devn]);
		    }

		}

		if(success) {
			_monitor.on('add', _onUdevAdd );
			_monitor.on('remove', _onUdevRemove );
			_monitor.on('change', _onUdevChange );
			successcb();
///////////
			// logHotplugInfo("test.....");

			// var lookup = [ [ 'ID_SERIAL', 'SanDisk_Cruzer_Glide_20044320321D5F9254FE-0:0' ],
			// [ 'ID_MODEL_FROM_DATABASE', undefined ],
			// [ 'ID_MODEL_ENC', 'Cruzer\\x20Glide\\x20\\x20\\x20\\x20' ],
			// [ 'ID_MODEL', 'Cruzer_Glide' ],
			// [ 'ID_BUS', 'usb' ] ];

			// logHotplugInfo("Lookup: " + util.inspect(lookup));
   //          var ret = signatureTree.lookup(lookup);

   //          if(ret)
   //          {
   //          	logHotplugInfo("Found it. " + ret);
   //          } else
   //          logHotplugInfo("not found.");
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
		_monitor.removeListener('add',_onUdevAdd);
		_monitor.removeListener('remove',_onUdevRemove);
		_monitor.removeListener('change',_onUdevChange);
	}


	/**
	 * Returns an object of objects with all cataloged devices (Devices which an onNew() has been called on)
	 * @return {[type]} [description]
	 */
	module.exports.getCatalog = function() {
		return catalogedDevices;
	}


	/**
	 * This asks the hotlplug system to scan for new devices. Useful on program startup and so forth. Will not detect a removal, only new stuff.
	 * @return {[type]} [description]
	 */
	module.exports.scanForDevices = function() {
		var udevlist = udev.list();
		if(options.verbose) {
			logHotplugInfo("list from udev ------------>");
			logHotplugInfo(util.inspect(udevlist));			
			logHotplugInfo("<---------------------------");
		}

		for(var N=0;N<udevlist.length;N++) {
			var path = [];
			var device = udevlist[N];

			for(var s=0;s<sortedFields.length;s++) {
	//	    	logHotplugInfo("signature: " + util.inspect(device));
	//	        logHotplugInfo("relevant field " + sortedFields[s][0] + " = " + device[sortedFields[s][0]]);
	            path.push([sortedFields[s][0],device[sortedFields[s][0]]]);
	        }
   	        //	logHotplugInfo("items for new fields: " + util.inspect(path));

   	        var ret = signatureTree.lookup(path);
   	        if(ret) {
   	        	if(options.verbose)
   	        		logHotplugInfo("Scan: Definition with matching signature found: (" + ret + ") " + deviceIndex[ret].name);
   	        }

   	        if(deviceIndex[ret]) {
   	        	var uuid = null;
   	        	try {
   	        		uuid = deviceIndex[ret].onSeen(device,{
   	        			platform: platform
   	        		});
   	        	} catch (e) {
   	        		logHotplugError("Error in handler for device: " + uuid + " --> " + e.message + e.stack);
   	        	}

   	        	if(uuid) {
   	        		if(!catalogedDevices[uuid]) {
   	        			catalogedDevices[uuid] = device;
   	        			try {

   	        				if(_overrideOnNewCB)
   	        					_overrideOnNewCB.call(undefined,deviceIndex[ret],catalogedDevices[uuid],uuid,{
   	        						platform: platform });
   	        				else
   	        					deviceIndex[ret].onNew(catalogedDevices[uuid],uuid,{
   	        						platform: platform
   	        					});
   	        				// deviceIndex[ret].onNew(catalogedDevices[uuid],uuid,{
   	        				// 	platform: platform
   	        				// });
   	        			} catch (e) {
   	        				logHotplugError("Error in onNew() handler for device: " + uuid + " --> " + e.message + e.stack);
   	        			}
   	        		}
   	        	} else {
   	        		logHotplugError("WARN: onSeen() for device returned a " + (typeof uuid));
   	        	}
   	        }

   	    }

	}


	/**
	 * @method rawDeviceList
	 * @return {object} returns a javascript object with a list of raw information on attached devices. OS-specific
	 */
//    module.exports.rawDeviceList = _monitor.list;

////////////////////////////////////////////
} else {
//////////////////////////////////////////// UNSUPPORTED

	module.exports.start = function(options) {
		logHotplugError("platform " + platform + " currently unsupported!!!");
	}

	module.exports.stop = function() {
		logHotplugError("platform " + platform + " currently unsupported!!!");
	}


    module.exports.rawDeviceList = function() { return {} };
////////////////////////////////////////////
}



/**
 * lets you overrid behavior for when a device is considered new. THis is good if you have your own
 * backend device instantiation system.
 * @param  {Function} cb 
 *
 * onNew(hotplugdef,device,uuid,platform) { }
 *
 * @return {[type]}      [description]
 */
module.exports.overrideOnNew = function(cb) {
	_overrideOnNewCB = cb;
}
module.exports.overrideOnRemove = function(cb) {
	_overrideOnRemoveCB = cb;
}
module.exports.overrideOnChange = function(cb) {
	_overrideOnChangeCB = cb;
}


module.exports.setErrorLogFunc = function(f) {
	logHotplugError = f;
}
module.exports.setInfoLogFunc = function(f) {
	logHotplugInfo = f;
}
