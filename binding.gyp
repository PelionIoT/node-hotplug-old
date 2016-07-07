{
    "targets": [
        {
            "target_name": "udev",
            "sources": [ 
            	"udev.cc",
            	"grease_client.c" 
            ],
            'cflags': [ '-fexceptions' ],
            'cflags_cc': [ '-fexceptions' ],

            "libraries": [
                "-ludev",
            ],
            "include_dirs": [
                 "<!(node -e \"require('nan')\")"
            ]
        }
    ]
}
