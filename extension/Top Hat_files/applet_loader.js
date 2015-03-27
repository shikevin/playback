function java_applet_security_exception() {
    if( !window["jQuery"] ) { return false; }
    window.jQuery(window).trigger("java_install.security_exception");
    return "callback_java_applet_security_exception";
}

function java_applet_download_exception() {
    if( !window["jQuery"] ) { return false; }
    window.jQuery(window).trigger("java_install.download_exception");
    return "callback_java_applet_download_exception";
}

function java_applet_extraction_exception() {
    if( !window["jQuery"] ) { return false; }
    window.jQuery(window).trigger("java_install.extraction_exception");
    return "callback_java_applet_extraction_exception";
}

function java_applet_install_exception() {
    if( !window["jQuery"] ) { return false; }
    window.jQuery(window).trigger("java_install.install_exception");
    return "callback_java_applet_install_exception";
}

function java_applet_install_complete() {
    navigator.plugins.refresh(false);
    if( !window["jQuery"] ) { return false; }
    $(window).trigger("java_install.complete");
    return "callback_java_applet_install_complete";
}
function java_applet_download_started() {
    if( !window["jQuery"] ) { return false; }
    $(window).trigger("java_install.download_started");
    return "callback_java_applet_download_started";
}
function deploy_applet(parent_el, attributes, parameters) {
    var s = '<' + 'applet ';
    var codeAttribute = false;
    for (var attribute in attributes) {
        s += (' ' + attribute + '="' + attributes[attribute] + '"');
        if (attribute == 'code') {
            codeAttribute = true;
        }
    }
    if (!codeAttribute) {
        s += (' code="dummy"');
    }
    s += ' mayscript>\n';

    if (parameters != 'undefined' && parameters != null) {
        var codebaseParam = false;
        for (var parameter in parameters) {
            if (parameter == 'codebase_lookup') {
                codebaseParam = true;
            }
            s += '<param name="' + parameter + '" value="' +
                parameters[parameter] + '">';
        }
        if (!codebaseParam) {
            s += '<param name="codebase_lookup" value="false">';
        }
    }
    s += '<' + '/' + 'applet' + '>';
    var applet = $(s);
    parent_el.append(applet);
}
