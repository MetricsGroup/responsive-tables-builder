'use strict';

const fs           = require('fs');
const yaml         = require('js-yaml');
const Handlebars   = require("handlebars");
const path         = require('path');
const minify       = require('@node-minify/core');
const htmlMinifier = require('@node-minify/html-minifier');

//
// Paths
//

const paths = {
  config: path.resolve('./', 'config.yaml'),
  data: path.resolve('./data/', 'sample.yaml'),
  styles: path.resolve('./styles/', 'styles.scss'),
  dist: path.resolve('./dist/', 'sample.html')
}

const templates = {
  dir: '/templates/',
  main: 'table.hbs',
  partials: [
    'caption',
    'head',
    'body',
    'footer'
  ]
}

//
// Read configuration
//

const configJSON = yaml.loadAll(fs.readFileSync(paths.config, {encoding: 'utf-8'}));
const config = configJSON[0];

//
// Read data
//

const dataJSON = yaml.loadAll(fs.readFileSync(paths.data, {encoding: 'utf-8'}));
// Uncomment to write intermediate JSON files to disk.
// fs.writeFileSync('./data/sample.json', JSON.stringify(dataJSON, null, 2));

//
// Handlebar helpers
//

Handlebars.registerHelper('columnCount', function() {
  var columnCount = Object.keys(dataJSON[0]['columns']).length;
  return new Handlebars.SafeString(columnCount);
});



//
// Styles
//

Handlebars.registerHelper('cssInclude', function(cssInclude){
  // For now we're just dumping the styles in as-is.
  const styles = fs.readFileSync(paths.styles, {encoding: 'utf-8'});
  const type = config.css;
  var content = '';

  switch(type) {
  case 'file':
    fs.writeFileSync('dist/styles.css', styles);
    console.log(`CSS file written to dist/styles.css`);
    return content;
    break;

  case 'ref':
    fs.writeFileSync('dist/styles.css', styles);
    content = '<style>\n@import url(styles.css);\n</style>';
    console.log(`CSS file written to dist/styles.css and included with @import`);
    return content;
    break;

  case 'include':
    content = '<style>\n' + styles + '</style>';
    console.log(`CSS included in HTML`);
    return content;
    break;

  default:
    console.log('Error: CSS option must be set to "include", "file" or "ref" in config.yaml');
  }
});

//
// Handlebar compiling
//

// Main template.
const template = fs.readFileSync(__dirname + templates.dir + templates.main, 'utf8');

// Partials.
for(let partial of templates.partials){
  Handlebars.registerPartial(partial, fs.readFileSync(__dirname + templates.dir + '_' + partial + '.hbs', 'utf8'));
}

// Handlebars debugging.

/**
* Register a debug helper for Handlebars to be able to log data or inspect data in the browser console
*
* Usage:
*   {{debug someObj.data}} => logs someObj.data to the console
*   {{debug someObj.data true}} => logs someObj.data to the console and stops at a debugger point
*
* Source: https://gist.github.com/elgervb/5c38c8d70870f92ef6338a291edf88e9
*
* @param {any} the data to log to console
* @param {boolean} whether or not to set a breakpoint to inspect current state in debugger
*/
Handlebars.registerHelper( 'debug', function( data, breakpoint ) {
    console.log(data);
    if (breakpoint === true) {
        debugger;
    }
    return '';
});
// use with {{log 0 this "myString" accountName}}
// DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3,
Handlebars.registerHelper('log', Handlebars.logger.log);
// Std level is 3, when set to 0, handlebars will log all compilation results
Handlebars.logger.level = 3;

// Creating HTML file.
const format = Handlebars.compile(template, {
  strict: true
});
const html = format(dataJSON);

switch(config.env) {
  case 'prod':
    minify({
      compressor: htmlMinifier,
      content: html,
      options: {
        collapseWhitespace: true,
        collapseInlineTagWhitespace: true,
        continueOnParseError: true,
        removeComments: true,
        minifyCSS: true
      },
      callback: (error, content) => {
        fs.writeFileSync(paths.dist, content);
      }
    });
    console.log(`HTML file written to ${paths.dist}`);
    break;

  case 'dev':
    fs.writeFileSync(paths.dist, html);
    console.log(`HTML file written to ${paths.dist}`);
    break;

  default:
    console.log('Error: Environment must be set to "dev" or "prod" in config.yaml');
}
