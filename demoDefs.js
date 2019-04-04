/*
 * Copyright (c) 2018, Arm Limited and affiliates.
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
         console.log("This is info on the attached/detached device: " + JSON.stringify(hotplugdata));
         console.log("This is platform: " + info.platform); 
         return "uniqueid-for-this-device"; // return a string which is unique to this device. If this device is unplugged, and plugged
                                            // back in, this string should be the same
     },
     onNew: function(hotplugdata,uuid,info) {
     	console.log(">>>>>>>>>>>>>>> Insteon modem - onNew() You should only see me once on plug-in ("+uuid+") <<<<<<<<<<<<<<<<<<<< ");
     },
     onRemove: function(hotplugdata,uuid,info) {
     	console.log(">>>>>>>>>>>>>>> Insteon modem - onRemove() You should only see me once on plug-in ("+uuid+") <<<<<<<<<<<<<<<<<<<< ");     	
     },
     onChange: function(hotplugdata_before, hotplugdata_after, uuid,info) {
         console.log("This is info on the changed device: " + JSON.stringify(hotplugdata));
     }
},
{
     name: "Sandisk USB memory",
     sigset: "A",  // SIGSET allows you to pass information amongs different signatures.
     signature: {  // one or more keys to look for in hotplug data. All keys must match. Can be value or regex
     	   "ID_MODEL_ENC" : /Cruzer.*/,
           "ID_MODEL": "Cruzer_Glide",
           "ID_BUS" : "usb"
     },
     description: "optional stuff", // optional
     onSeen: function(hotplugdata,info,sigset) {
        sigset.hello = 1; // this valu could be shared with other signature in the sigset "A"... this is to help with coordination of multiple hotplug 
                      // messages. For instance, a multipurpose USB device may actually create multiple hotplug events.
     	 console.log("See a memory stick.");
         console.log("This is info on the attached/detached device: " + JSON.stringify(hotplugdata));
         console.log("This is platform: " + info.platform); 
         return hotplugdata.ID_SERIAL_SHORT; // return a string which is unique to this device. If this device is unplugged, and plugged
                                            // back in, this string should be the same
     },
     onNew: function(hotplugdata,uuid,info) {
     	console.log(">>>>>>>>>>>>>>> Sandisk memory - onNew() You should only see me once on plug-in ("+uuid+") <<<<<<<<<<<<<<<<<<<< ");
        hotplugdata.SAVE_NEW_INFO="xyz";
     },
     onRemove: function(hotplugdata,uuid,info) {
        log.debug("retrieve old info: " + hotplugdata.SAVE_NEW_INFO);
     	console.log(">>>>>>>>>>>>>>> Sandisk memory - onRemove() You should only see me once on plug-in ("+uuid+") <<<<<<<<<<<<<<<<<<<< ");
     },
     onChange: function(hotplugdata_before, hotplugdata_after, uuid, info) {
         console.log("This is info on the changed device: " + JSON.stringify(hotplugdata));
     }
},
{
     name: "NOT Sandisk USB memory",
     sigset: "A",
     signature: {  // one or more keys to look for in hotplug data. All keys must match. Can be value or regex
     	   "ID_MODEL_ENC" : /Cruzer.*/,
           "ID_MODEL": "aslkdasjkldjaslkd",
           "ID_BUS" : "usb"
     },
     description: "optional stuff", // optional
     onSeen: function(hotplugdata,info) { 
        if(sigset && sigset.hello == 1) {
            console.log("Found test 'hello'");
        }
        console.log("Found a memory stick.");
        console.log("This is info on the newly attached device: " + JSON.stringify(hotplugdata));
        console.log("This is platform: " + info.platform); 
        return "uniqueid-for-this-device"; // return a string which is unique to this device. If this device is unplugged, and plugged
                                            // back in, this string should be the same
     },
     onNew: function(hotplugdata,uuid,info) {
     	console.log("YOU SHOULD NOT SEE THIS!!! (uuid:" + uuid + ")");
     },
     onRemove: function(hotplugdata, info) {
         console.log("This is info on the removed device: " + JSON.stringify(hotplugdata));
     },
     onChange: function(hotplugdata_before, hotplugdata_after, info) {
         console.log("This is info on the changed device: " + JSON.stringify(hotplugdata));
     }
}





]