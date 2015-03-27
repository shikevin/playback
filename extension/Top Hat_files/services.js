/* Services.js - External Service Repository
 * -----------------------------------------
 * This file contains the includes for all external service libraries that we
 * might include in the Top Hat application.  Each service should be added to
 * this file, documented, and explained.
 */




/* The Service Object
 * ------------------
 * The Service Object is a lightweight wrapper around external service includes.
 * Simple call the `Service.add` method as shown below (in the example for AdRoll),
 * and the "check" method will be called on body load.  This way, we can use the
 * `Service.isLoaded(name)` method to check for the existence of services.
 *
 * Arguments (Keys):
 *   name: The name/key you want to use for this service.  This is the name that needs
 *         to be used when checking if a service has been loaded.
 *
 *   init: The code snippet that was provided as part of the service.  This snippet
 *         often generates script tags to load the external resource. This method will be
 *         executed when `Service.load` is called with the appropriate arguments. One
 *         caveat of this approach is that you MUST modify the snippet to RETURN THE
 *         GENERATED SCRIPT ELEMENT.
 *
 *
 *   check: This method is called on document load to ensure that the service was
 *          loaded without issue.  This function can do whatever you like, bust most
 *          often it will just check for the existence of window.<object>. This method
 *          must return true/false.
 */

var Service = {
    init: function(){
        setTimeout(function(){
            var service, key;
            _.each(Service.services, function (service) {
                service.loaded = service.check();
            });
        }, 100);
    },

    add: function(config){
        Service.services[config.name] = {"init": config.init, "check": config.check, "loaded": false};
    },

    isLoaded: function(name){
        var service = Service.services[name];
        return !!(service && service.loaded);
    },

    load: function(){
        var service_name, script, i;
        for(i = 0; i < arguments.length; i++){
            service_name = arguments[i];
            if(!Service.isLoaded(service_name)){
                script = Service.services[service_name].init();
                script.onload = Service.events.onload;
                script.onreadystatechange = Service.events.onreadystatechange;
            } else {
                Service.services[service_name].loaded = true;
            }
        }
    },

    events: {
        onload: function(){
            Service.init();
        },

        onreadystatechange: function(){
            if(this.readyState == "complete"){
                Service.init();
            }
        }
    },

    run: function(service, fn){
        if(Service.isLoaded(service)){
            fn();
            return true;
        }
        return false;
    },

    services: {}
};

/* Service Definitions */
/* ------------------- */

// AdRoll
// ------
// Used to stop providing advertisements to professors after they sign up
Service.add({
    name: "adroll",
    init: function(){
        adroll_adv_id = "SXPYOW56LZDAXJLV3FQG4H";
        adroll_pix_id = "TIC7HXBGLVAXHG7LT7PJOH";

       __adroll_loaded=true;
       var scr = document.createElement("script");
       var host = (("https:" == document.location.protocol) ? "https://s.adroll.com" : "http://a.adroll.com");
       scr.setAttribute('async', 'true');
       scr.type = "text/javascript";
       scr.src = host + "/j/roundtrip.js";
       ((document.getElementsByTagName('head') || [null])[0] ||
        document.getElementsByTagName('script')[0].parentNode).appendChild(scr);

       return scr;
    },
    check: function(){
        return Object.prototype.hasOwnProperty.call(window, "__adroll");
    }
});

// WalkMe
// ------
// Used to give guided walkthroughs to professors
Service.add({
    name: "walkme",
    init: function(){
        var walkme = document.createElement('script'); walkme.type = 'text/javascript'; walkme.async = true;
        walkme.src = 'https://d3b3ehuo35wzeh.cloudfront.net/users/50da9c7eeffe43d080db8fc5e642ab72/walkme_50da9c7eeffe43d080db8fc5e642ab72_https.js';
        var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(walkme, s);

        return walkme;
    },
    check: function(){
        return Object.prototype.hasOwnProperty.call(window, "WalkmeSnippet");
    }
});

// Google Analytics
// ----------------
// Used to track user and usage data for the application
Service.add({
    name: "google_analytics",
    init: function(){
        var _gaq = _gaq || [];
            _gaq.push(['_setAccount', 'UA-15136788-1']);
            _gaq.push(['_setDomainName', 'tophat.com']);
            _gaq.push(['_trackPageview']);

            var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
            ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
            var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);

            return ga;
    },
    check: function(){
        return Object.prototype.hasOwnProperty.call(window, "_gat");
    }
});

// MixPanel
// --------
// Used to track usage and user event data within the application
Service.add({
    name: "mixpanel",
    init: function(){
        var c = document;
        var a = window.mixpanel || [];

        window.mixpanel=a;var b,d,h,e;b=c.createElement("script");
        b.type="text/javascript";b.async=!0;b.src=("https:"===c.location.protocol?"https:":"http:")+
        '//cdn.mxpnl.com/libs/mixpanel-2.2.min.js';d=c.getElementsByTagName("script")[0];
        d.parentNode.insertBefore(b,d);a._i=[];a.init=function(b,c,f){function d(a,b){
        var c=b.split(".");2==c.length&&(a=a[c[0]],b=c[1]);a[b]=function(){a.push([b].concat(
        Array.prototype.slice.call(arguments,0)))}}var g=a;"undefined"!==typeof f?g=a[f]=[]:
        f="mixpanel";g.people=g.people||[];h=['disable','track','track_pageview','track_links',
        'track_forms','register','register_once','unregister','identify','alias','name_tag','set_config',
        'people.set','people.set_once','people.increment','people.track_charge','people.append'];
        for(e=0;e<h.length;e++)d(g,h[e]);a._i.push([b,c,f])};a.__SV=1.2;

        // Initialize mixpanel
        var token;
        if(window.mixpanel_token){
            token = window.mixpanel_token;
        }
        if(window.site_data && window.site_data.settings.MIXPANEL_TOKEN){
            token = window.site_data.settings.MIXPANEL_TOKEN;
        }

        mixpanel.init(token);
        return b;
    },
    check: function(){
        return Object.prototype.hasOwnProperty.call(window, "mixpanel") && !!mixpanel.track;
    }
});

// FullStory
// --------
// Used to track user events
Service.add({
    name: 'fullstory',
    init: function () {
        window['_fs_debug'] = false;
        window['_fs_host'] = 'www.fullstory.com';
        window['_fs_org'] = 'yqm';
        var m = window, n = document, e = 'FS', t = 'script', l = 'user',
            o, g, y;
        g=m[e]=function(a,b){g.q?g.q.push([a,b]):g._api(a,b);};g.q=[];
        o=n.createElement(t);o.async=1;o.src='https://'+_fs_host+'/s/fs.js';
        y=n.getElementsByTagName(t)[0];y.parentNode.insertBefore(o,y);
        g.identify=function(i,v){g(l,{uid:i});if(v)g(l,v)};g.setUserVars=function(v){FS(l,v)};
        g.setSessionVars=function(v){FS('session',v)};g.setPageVars=function(v){FS('page',v)};

        var user = window.user;
        if (user) {
            FS.identify(user.id, {
                displayName: user.name(),
                email: user.get('email')
            });
        }

        return o;
    },

    check: function () {
        return Object.prototype.hasOwnProperty.call(window, 'FS');
    }
});
