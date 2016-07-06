#include <v8.h>
#include <node.h>
#include "grease_client.h"
#include "nan.h"

#include <libudev.h>

using namespace v8;

static struct udev *udev;

static void PushProperties(Local<Object> obj, struct udev_device* dev) {
    struct udev_list_entry* sysattrs;
    struct udev_list_entry* entry;
    sysattrs = udev_device_get_properties_list_entry(dev);
    udev_list_entry_foreach(entry, sysattrs) {
        const char *name, *value;
        name = udev_list_entry_get_name(entry);
        value = udev_list_entry_get_value(entry);
        if (value != NULL) {
            obj->Set(String::New(name), String::New(value));
        } else {
            obj->Set(String::New(name), Null());
        }
    }
}

class Monitor : public Nan::ObjectWrap {
    struct poll_struct {
        Nan::Persistent<v8::Object> monitor;
    };
public:
    static Nan::Persistent<Function> constructor;

    static void Init() {
        Local<FunctionTemplate> tpl = Nan::New<v8::FunctionTemplate>(New);
        tpl->SetClassName(Nan::New("Monitor").ToLocalChecked());
        tpl->InstanceTemplate()->SetInternalFieldCount(1);

        tpl->PrototypeTemplate()->Set(Nan::New("close").ToLocalChecked(),
            Nan::New<v8::FunctionTemplate>(Close)->GetFunction());

        constructor.Reset(tpl->GetFunction());
    };

private:
    static void on_handle_close(uv_handle_t *handle) {
        poll_struct* data = (poll_struct*)handle->data;
        data->monitor.Reset();
        delete data;
        delete handle;
    }

    static void on_handle_event(uv_poll_t* handle, int status, int events) {
        HandleScope scope;
        poll_struct* data = (poll_struct*)handle->data;

        Monitor* wrapper = Nan::ObjectWrap::Unwrap<Monitor>(Nan::New(data->monitor));
        udev_device* dev = udev_monitor_receive_device(wrapper->mon);

        Local<Object> obj = Nan::New<v8::Object>();
        Nan::Set(obj, Nan::New("syspath").ToLocalChecked(), 
            Nan::New(udev_device_get_syspath(dev)).ToLocalChecked());
        PushProperties(obj, dev);

        Nan::TryCatch tc;
        Nan::MaybeLocal<Value> emit_v = Nan::Get(Nan::New(data->monitor), Nan::New("emit").ToLocalChecked());
        Nan::MaybeLocal<v8::Function> emit = emit_v.ToLocalChecked();

        v8::Local<v8::Value> emitArgs[2];
        emitArgs[0] = Nan::New(udev_device_get_action(dev)).ToLocalChecked();
        emitArgs[1] = obj;
        emit.ToLocalChecked()->Call(Nan::New(data->monitor), 2, emitArgs);

        udev_device_unref(dev);
        if (tc.HasCaught()) Nan::FatalException(tc);
    };

    static NAN_METHOD(New) {
        HandleScope scope;
        uv_poll_t* handle;
        Monitor* obj = new Monitor();
        obj->mon = udev_monitor_new_from_netlink(udev, "udev");
        udev_monitor_enable_receiving(obj->mon);
        obj->fd = udev_monitor_get_fd(obj->mon);
        obj->poll_handle = handle = new uv_poll_t;
        obj->Wrap(info.This());

        poll_struct* data = new poll_struct;
        data->monitor.Reset(info.This());
        handle->data = data;
        uv_poll_init(uv_default_loop(), obj->poll_handle, obj->fd);
        uv_poll_start(obj->poll_handle, UV_READABLE, on_handle_event);
        return info.GetReturnValue().Set(info.This());
    };

    static NAN_METHOD(Close) {
        Monitor* obj = Nan::ObjectWrap::Unwrap<Monitor>(info.This());
        uv_poll_stop(obj->poll_handle);
        uv_close((uv_handle_t*)obj->poll_handle, on_handle_close);
        udev_monitor_unref(obj->mon);
    };

    uv_poll_t* poll_handle;
    udev_monitor* mon;
    int fd;
};

Nan::Persistent<Function> Monitor::constructor;

static NAN_METHOD(List) {
    HandleScope scope;
    Local<Array> list = Array::New();

    struct udev_enumerate* enumerate;
    struct udev_list_entry* devices;
    struct udev_list_entry* entry;
    struct udev_device *dev;

    enumerate = udev_enumerate_new(udev);
    // add match etc. stuff.
    udev_enumerate_scan_devices(enumerate);
    devices = udev_enumerate_get_list_entry(enumerate);

    int i = 0;
    udev_list_entry_foreach(entry, devices) {
        const char *path;
        path = udev_list_entry_get_name(entry);
        dev = udev_device_new_from_syspath(udev, path);
        Local<Object> obj = Object::New();
        PushProperties(obj, dev);
        obj->Set(String::NewSymbol("syspath"), String::New(path));
        list->Set(i++, obj);
        udev_device_unref(dev);
    }

    udev_enumerate_unref(enumerate);
}

static void Init(Handle<Object> exports, Handle<Object> module) {
    udev = udev_new();
    if (!udev) {
        Nan::ThrowError(Nan::New("Can't create udev\n").ToLocalChecked());
    }

    Monitor::Init();

    Nan::Set(exports, Nan::New("Monitor").ToLocalChecked(), 
        Nan::New(Monitor::constructor));

    Nan::Set(exports, Nan::New("list").ToLocalChecked(), 
        Nan::GetFunction(Nan::New<FunctionTemplate>(List)).ToLocalChecked());
}
NODE_MODULE(udev, Init)