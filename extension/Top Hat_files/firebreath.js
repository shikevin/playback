/*****************************************************************\
Firebreath JS installer and instantiation script
Original Author: Richard Bateman (taxilian)
Modified by: Anson MacKeracher (amackera)

Created:    Dec 9, 2009
License:    Dual license model; choose one of two:
            New BSD License
            http://www.opensource.org/licenses/bsd-license.php
            - or -
            GNU Lesser General Public License, version 2.1
            http://www.gnu.org/licenses/lgpl-2.1.html

Copyright 2009 PacketPass, Inc and the Firebreath development team
\*****************************************************************/

/*********************************************\
 This package defines shared FB functionality.
 Individual plugin data is generated at the end
\*********************************************/
if (typeof FireBreath === 'undefined') {
    FireBreath = { };
    FireBreath.pluginDefs = { };

    FireBreath.$ = function(el) {
        if (typeof(el) == "string") {
            return document.getElementById(el);
        } else {
            return el;
        }
    };

	// returns:
	//	- null: no plugin definition found in FireBreath.pluginDefs
	//	- false: plugin not installed
	//	- true: plugin exists but no version could be obtained
	//	- <NPAPI>:version number from np DLL file-name
	//	- <IE>:version property returned by instanced plugin object
	FireBreath.isPluginInstalled = function(pluginName) {
		//check if plugin exists
		if (!FireBreath.pluginDefs[pluginName]) {
			return null;
		}

		if (window.ActiveXObject || 'ActiveXObject' in window) {
			// We're running IE
			return FireBreath._isIEPluginInstalled(pluginName);
		} else if (navigator.plugins) {
			// We're running something else
			return FireBreath._isNpapiPluginInstalled(pluginName);
		}
	};

	FireBreath._isIEPluginInstalled = function(pluginName) {
		var axname = FireBreath.pluginDefs[pluginName].activeXName;

		// Check if plugin exists
		var plugin = false;
		try {
			plugin = new ActiveXObject(axname);
		} catch (e) {
			return null;
		}

		var version = false;

		if(plugin)
		{
			try {
				version = plugin.version;
			} catch (e) {
				version = true; // Installed, unknown version
			}
		}
		return version;
	};

	FireBreath._isNpapiPluginInstalled = function(pluginName) {
        navigator.plugins.refresh(false); // refresh list of plugins

		var mimeType = FireBreath.pluginDefs[pluginName].mimeType;
		var name = FireBreath.pluginDefs[pluginName].name;

		if (typeof(navigator.plugins[name]) != "undefined") {
			var re = /([0-9.]+)\.dll/; // look for the version at the end of the filename, before dll

			// Get the filename
			var filename = navigator.plugins[name].filename;
			// Search for the version
			var fnd = re.exec(filename);
			if (fnd === null) { // no version found
				return true; // plugin installed, unknown version
			} else {
				return fnd[1]; // plugin installed, returning version
			}
		}

		return false;
	}

    FireBreath.getPluginVersion = function(pluginName) {
		if (window.ActiveXObject) {
			// We're running IE
			return FireBreath._getIEPluginVersion(pluginName);
		} else if (navigator.plugins) {
			// We're running something else
			return FireBreath._getNpapiPluginVersion(pluginName);
		}
    }

    FireBreath._getIEPluginVersion = function(pluginName) {
        // TODO
    }

    FireBreath._getNpapiPluginVersion = function(pluginName) {
        navigator.plugins.refresh(false); // refresh list of plugins
        var name = FireBreath.pluginDefs[pluginName].name;

        if (typeof(navigator.plugins[name]) != "undefined") {
            var description = navigator.plugins[name].description;
            if (description != undefined) {
                var version = navigator.plugins[name].description.split(". ")[1];
                if (version != undefined) {
                    return version;
                } else {
                    return "0.00.00";
                }
            } else {
                return "0.00.00";
            }
        }
    }
}

/*********************************************\
 Here the data for all the plugins is defined
 - To support multiple plugins with the same
   install script, add additional entries
 - To support one plugin with multiple mime-
   types, pretend that it's a second plugin =]
\*********************************************/
FireBreath.pluginDefs.monocleGL = {
		"name"          : "monocleGL",
		"mimeType"      : "application/x-monoclegl",
		"activeXName"   : "TopHatMonocle.monoclegl",
		"guid"          : "b311bcdb-4842-599c-b37a-776487f5cd3b"
	};
