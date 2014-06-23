# node-hotplug

This is a hotplug system for node.js. It is in early development but is meant to handle all types of devices being plugged into or removed from a system. It is designed to be able to deal with a *large* database of 'signatures' relatively quickly.

### Build directions

    node-gyp configure
    node-gyp build
    
If using devicejs use <code>node-gyp-dev</code> in the local node directory.

----

Original projects this is based on:

## node-udev - list devices in system and detect changes on them

This library attempts to follow the libudev where it makes sense. I only needed some usb input device detection so I was happy with quite few features.

Requires node-v0.8.0 and libudev.

## Installation

    npm install udev

### Installation on debian/ubuntu

    sudo apt-get install libudev-dev
    npm install udev

## How to Use

    var udev = require("udev");

    console.log(udev.list()); // this is a long list :)

    var monitor = udev.monitor();
    monitor.on('add', function (device) {
        console.log('added ' + device);
        monitor.close() // this closes the monitor.
    });
    monitor.on('remove', function (device) {
        console.log('removed ' + device);
    });
    monitor.on('change', function (device) {
        console.log('changed ' + device);
    });
