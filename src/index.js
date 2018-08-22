'use strict'

var fs = require('fs');
var path = require('path');
var pkg = require('../package.json');
var semver = require('semver');
var chalk = require('chalk');
var resolve = require('resolve');
var program = require('commander');
var argvs = process.argv;
var command = argvs[2];

if (!semver.satisfies(process.version, pkg.engines.node)) {
    console.log(chalk.red.bold('Require nodejs version ' + pkg.engines.node + ', current ' + process.version));
    console.log('Download the latest nodejs here ' + chalk.green('https://nodejs.org/en/download/'));
    process.exit();
}
program
    .version(pkg.version)
    .usage('<command> [options]');

var moduleDirs = [
    path.join(__dirname, '..', 'node_modules'),
    path.join(__dirname, '..', '..')
];
program._moduleDirs = moduleDirs;

var pluginPath = findPluginPath(command);

if (pluginPath) {
    var pluginDef = require(pluginPath);
    var plugin = program.command(pluginDef.command || command);
    
    if (pluginDef.description) {
        plugin.description(pluginDef.description);
    }

    if (pluginDef.options) {
       // default options in abc.json
        var defaultOpts = loadDefaultOpts(process.cwd(), 'abc.json');
        var optNameReg = /\-\-(\w+)/;
        pluginDef.options.forEach(function(optArgs) {
            if (optArgs) {
                plugin.option.apply(plugin, optArgs);

                // replace default value with options in abc.json
                var matches = optNameReg.exec(optArgs[0]);
                if (matches && matches[1] in defaultOpts) {
                plugin[matches[1]] = defaultOpts[matches[1]]
                }
            }
        });

    }

    if (pluginDef.action) {
        plugin.action(function(cmd, opts) {
            console.log('11111111', cmd, '222222222', opts);
          if (cmd instanceof program.Command) {
            opts = cmd;
            cmd = '';
          }
          opts = opts || {};
    
          // run plugin action
          if (cmd) {
            pluginDef.action.call(this, cmd, opts);
          } else {
            pluginDef.action.call(this, opts);
          }
        });
    }    
} else {

}

program.parse(argvs);

if (!argvs.slice(2).length) {
    program.outputHelp();
}

// locate the plugin by command
function findPluginPath(command) {
    if (command && /^\w+$/.test(command)) {
        try {
            return resolve.sync('glon-' + command, {
                paths: moduleDirs
            });
        } catch (e) {
            console.log('');
            console.log('  ' + chalk.green.bold(command) + ' command is not installed.');
            console.log('  You can try to install it by ' + chalk.blue.bold('glon install ' + command) + '.');
            console.log('');
        }
    }
}

// load default options
function loadDefaultOpts(startDir, configFile) {
    try {
      return require(path.join(startDir, configFile)).options;
    } catch (e) {
      var dir = path.dirname(startDir);
      if (dir === startDir) {
        return {};
      }
      return loadDefaultOpts(dir, configFile);
    }
}
  