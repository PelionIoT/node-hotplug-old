module.exports = [



{
     name: "Insteon modem",
     signature: {  // one or more keys to look for in hotplug data. All keys must match. Can be value or regex
           "ID_SERIAL" : "FTDI_FT232R_USB_UART_A901M8MU",
           "ID_MODEL_FROM_DATABASE": /FT232.*/,
           "ID_BUS" : "usb"
     },
     description: "optional stuff", // optional
     onSeen: function(hotplugdata,info) { 
     	 console.log("Found an Insteon modem");
         console.log("This is info on the newly attached device: " + JSON.stringify(hotplugdata));
         console.log("This is platform: " + info.platform); 
         return "uniqueid-for-this-device"; // return a string which is unique to this device. If this device is unplugged, and plugged
                                            // back in, this string should be the same
     },
     onNew: function(hotplugdata,uuid,info) {
     	console.log("Insteon modem - onNew()");
     },
     onRemove: function(hotplugdata, info) {
         console.log("This is info on the removed device: " + JSON.stringify(hotplugdata));
     },
     onChange: function(hotplugdata_before, hotplugdata_after, info) {
         console.log("This is info on the changed device: " + JSON.stringify(hotplugdata));
     }
},
{
     name: "Sandisk USB memory",
     signature: {  // one or more keys to look for in hotplug data. All keys must match. Can be value or regex
     	   "ID_MODEL_ENC" : /Cruzer.*/,
           "ID_MODEL": "Cruzer_Glide",
           "ID_BUS" : "usb"
     },
     description: "optional stuff", // optional
     onSeen: function(hotplugdata,info) { 
     	 console.log("See a memory stick.");
         console.log("This is info on the newly attached device: " + JSON.stringify(hotplugdata));
         console.log("This is platform: " + info.platform); 
         return hotplugdata.ID_SERIAL; // return a string which is unique to this device. If this device is unplugged, and plugged
                                            // back in, this string should be the same
     },
     onNew: function(hotplugdata,uuid,info) {
     	console.log(">>>>>>>>>>>>>>> Sandisk memory - onNew() You should only see me once on plug-in ("+uuid+") <<<<<<<<<<<<<<<<<<<< ");
     },
     onRemove: function(hotplugdata, info) {
         console.log("This is info on the removed device: " + JSON.stringify(hotplugdata));
     },
     onChange: function(hotplugdata_before, hotplugdata_after, info) {
         console.log("This is info on the changed device: " + JSON.stringify(hotplugdata));
     }
},
{
     name: "NOT Sandisk USB memory",
     signature: {  // one or more keys to look for in hotplug data. All keys must match. Can be value or regex
     	   "ID_MODEL_ENC" : /Cruzer.*/,
           "ID_MODEL": "aslkdasjkldjaslkd",
           "ID_BUS" : "usb"
     },
     description: "optional stuff", // optional
     onSeen: function(hotplugdata,info) { 
     	 console.log("Found a memory stick.");
         console.log("This is info on the newly attached device: " + JSON.stringify(hotplugdata));
         console.log("This is platform: " + info.platform); 
         return "uniqueid-for-this-device"; // return a string which is unique to this device. If this device is unplugged, and plugged
                                            // back in, this string should be the same
     },
     onNew: function(hotplugdata,uuid,info) {
     	console.log("YOU SHOULD NOT SEE THIS!!!");
     },
     onRemove: function(hotplugdata, info) {
         console.log("This is info on the removed device: " + JSON.stringify(hotplugdata));
     },
     onChange: function(hotplugdata_before, hotplugdata_after, info) {
         console.log("This is info on the changed device: " + JSON.stringify(hotplugdata));
     }
}





]