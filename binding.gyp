{
    "targets": [
        {
            "target_name": "udev",
            "sources": [ 
            	"udev.cc",
            	"grease_client.c" 
            ],
            "libraries": [
                "-ludev",
            ],
            "include_dirs": [
                 "<!(node -e \"require('nan')\")"
            ]
        }
    ]
}
