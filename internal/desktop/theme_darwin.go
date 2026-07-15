//go:build darwin && cgo

package desktop

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework Cocoa

#import <Cocoa/Cocoa.h>
#include <stdlib.h>
#include <string.h>

static void GalaxyTermSetWindowTheme(const char *theme) {
    int mode = 0;
    if (strcmp(theme, "light") == 0) {
        mode = 1;
    } else if (strcmp(theme, "dark") == 0) {
        mode = 2;
    }

    dispatch_async(dispatch_get_main_queue(), ^{
        NSWindow *window = [NSApp keyWindow];
        if (window == nil) {
            window = [NSApp mainWindow];
        }
        if (window == nil && [[NSApp windows] count] > 0) {
            window = [[NSApp windows] objectAtIndex:0];
        }
        if (window == nil) {
            return;
        }

        if (mode == 1) {
            [window setAppearance:[NSAppearance appearanceNamed:NSAppearanceNameAqua]];
        } else if (mode == 2) {
            if (@available(macOS 10.14, *)) {
                [window setAppearance:[NSAppearance appearanceNamed:NSAppearanceNameDarkAqua]];
            } else {
                [window setAppearance:nil];
            }
        } else {
            [window setAppearance:nil];
        }
    });
}
*/
import "C"

import "unsafe"

func setWindowTheme(theme string) {
	value := C.CString(theme)
	defer C.free(unsafe.Pointer(value))
	C.GalaxyTermSetWindowTheme(value)
}
