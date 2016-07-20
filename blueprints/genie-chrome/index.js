/*jshint node:true*/
var utils = require('../../lib/utils/utils');
var merge = require('object-merge');

module.exports = {
  description: 'Setup Chrome with Travis',

  normalizeEntityName: function() {},

  afterInstall: function() {
    this._setupChromeWithTravis();
    this._modifyTestemJs();
  },

  _modifyTestemJs: function() {
    // load testem content as js object for easier manipulations and support of any file structure
    var testemJs;
    try {
      testemJs = require('../../../../testem.js');
    } catch(err) {
      console.warn("WARN genie-chrome: testem.js need to be updated but could not be found.");
      return;
    }

    // rebuild "launch_in_ci" array
    testemJs.launch_in_ci = testemJs.launch_in_ci || [];
    var launchInCi = testemJs.launch_in_ci;

    var indexOfPhantom = launchInCi.indexOf("PhantomJS");
    if (indexOfPhantom !== -1) {
      launchInCi.splice(indexOfPhantom);
    }

    if (launchInCi.indexOf("Chrome") === -1) {
      launchInCi.push("Chrome");
    }

    // replace module content
    var data = utils.getContents.call(this, 'testem.js');
    var moduleExp = /^((.|\n)*module\.exports\s*=\s*)({(.|\n)*})(;(.|\n)*)/;
    var regexParts = data.match(moduleExp);

    if (regexParts && regexParts.length >= 5) {
      data = data.replace(moduleExp, "$1" + JSON.stringify(testemJs, null, 2) + "$5");
      utils.setContents.call(this, 'testem.js', 'js', data);
    } else {
      console.warn("WARN genie-chrome: testem.js could not be modified due to incorrect format. Maybe a lack of a final `;` ?");
    }
  },

  _setupChromeWithTravis: function() {
    var travisYaml = utils.getContents.call(this, '.travis.yml', 'yaml');
    var beforeInstall, i;
    var chromeSetup = {
      sudo: 'required',
      dist: 'trusty',
      addons: {
        apt: {
          sources: [
            'google-chrome'
          ],
          packages: [
            'google-chrome-stable'
          ]
        }
      }
    };

    travisYaml = merge(travisYaml, chromeSetup);

    // Add chrome required setup scripts
    beforeInstall = travisYaml.before_install;

    if(beforeInstall.indexOf('export DISPLAY=:99.0') === -1) {
      beforeInstall.unshift('export DISPLAY=:99.0', 'sh -e /etc/init.d/xvfb start');
    }

    // Remove phantomjs script
    var found = false;
    for(i = 0; i < beforeInstall.length; i++) {
      if(beforeInstall[i].indexOf('phantomjs') !== -1) {
        found = true;
        break;
      }
    }

    if(found) {
      beforeInstall.splice(i, 1);
    }

    utils.setContents.call(this, '.travis.yml', 'yaml', travisYaml);
  }
};
