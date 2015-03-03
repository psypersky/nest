process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

var _            = require('lodash');
var async        = require('async');
var phantom      = require('phantom');
var request      = require('request');
var cheerio      = require('cheerio');
var EventEmitter = require('events').EventEmitter;

var config       = require('../../config');
var _log         = require('../logger');
var debug        = _log.debug('Spider');

// Exports: Spider
//
module.exports = Spider;


function Spider() {
	this.running    = true;
	this.phantom    = null;
	this.iterations = 0;
	this.emitters   = [];
}

Spider.prototype = _.clone(EventEmitter.prototype);

// Override: EventEmitter.emit
Spider.prototype.emit = function() {
	var args = _.toArray(arguments);

	// emit the event through own emitter
	EventEmitter.prototype.emit.apply(this, args);

	// emit the event through all the attached emitters
	_.each(this.emitters, function(emitter) {

		// go through this emitter's emitters, if any.
		if ( emitter.emitters )
			Spider.prototype.emit.apply(emitter, args);

		// or, emit the event through this emitter
		else
			EventEmitter.prototype.emit.apply(emitter, args);
	});
};

// runs an operation
Spider.prototype.scrape = require('./scrape');

// enables "verbose" mode
Spider.prototype.verbose = function() {
	this.on('start',        debug.bind(this, 'Starting operation.'));
	this.on('finish',       debug.bind(this, 'Operation finished.'));
	this.on('scraped:raw',  debug.bind(this, 'Got raw scraped data.'));
	this.on('scraped:page', debug.bind(this, 'Scraped a page.'));
};

// opens a URL, returns a loaded page ready to be scraped
// if "useStatic" is true, it will use cheerio instead of PhantomJS to scrape 
// 
Spider.prototype.open = function(url, dynamic, callback) {
	if ( typeof dynamic === 'function' ) {
		callback = dynamic;
		dynamic = false;
	}

	this.url = url;

	if ( dynamic || process.env.FORCE_DYNAMIC ) {
		debug('Opening URL '+url+' with PhantomJS');
		this.openDynamic.call(this, url, callback);
	}

	else {
		debug('Opening URL '+url);
		this.openStatic.call(this, url, callback);
	}
};

Spider.prototype.openDynamic = function(url, callback) {
	var self = this;

	async.waterfall([
		function getPhantom(cb) {
			if ( self.phantom ) return cb(null, self.phantom);
			self.createPhantom(cb);
		},
		function createPhantomTab(phantom, cb) {
			phantom.createPage( function(page) {
				cb(null, page);
			});
		},
		function enableConsole(page, cb) {
			if ( process.env.PHANTOM_LOG === 'true' ) {
				page.set('onConsoleMessage', function (msg) {
					console.log("Phantom Console: " + msg);
				});
			}
			cb(null, page);
		},
		function openURL(page, cb) {
			page.open(url, function(status) {
				if (!status) return cb('Could not open url: '+url);
				cb(null, page);
			});
		},
		function includeJS(page, cb) {
			self.includeJS(page, function(status) {
				if (!status) return cb('Could not include JS on url: '+url);
				self.emit('page:ready', page);
				cb(null, page);
			});
		},
		function LoadPage(page, cb) {
			page.evaluate(function() {
				return $('html').html();
			}, function(html) {
				cb(null, new Page(url, html));
			});
		},
	], callback);
};

Spider.prototype.openStatic = function(url, callback) {
	request(url, function(error, response, html) {
		if (error) return callback(error);
		callback(null, new Page(url, html));
	});
};

// creates a phantomJS instance
Spider.prototype.createPhantom = function(callback) {
	var self = this;

	debug('Creating PhantomJS instance');
	phantom.create(config.phantom, function(ph) {
		self.phantom = ph;
		callback(null, ph);
	});
};

// stops its phantomJS instance
Spider.prototype.stopPhantom = function() {

	if ( this.phantom ) {
		debug('Stopping PhantomJS');
		this.phantom.exit();
	}

	this.phantom = null;
};

// includes javascript <script> tags in opened web page
Spider.prototype.includeJS = function(page, callback) {
	debug('Including JS on page');
	page.includeJs('https://code.jquery.com/jquery-2.1.1.min.js', callback);
};

// stops the spider, optionally clearing the listeners
Spider.prototype.stop = function(removeListeners) {
	debug('Stopping Spider.');

	if ( removeListeners )
		this.removeAllListeners();

	this.stopPhantom();
	this.running = false;
};

// adds an external EventEmitter
Spider.prototype.addEmitter = function(emitter) {
	this.emitters.push(emitter);
};

// removes an EventEmitter
Spider.prototype.removeEmitter = function(emitter) {
	_.pull(this.emitters, emitter);
};

// sanitize the raw scraped data
Spider.prototype.sanitizeScraped = function(scraped) {
	var sanitized = _.clone(scraped ? scraped : {});

	debug('Sanitizing scraped');

	// set up defaults
	_.defaults(sanitized, {
		hasNextPage: false,
		items: [],
		operations: [],
	});

	// validate scraped.items and scraped.operations type
	['items', 'operations'].forEach( function(field) {
		if ( !(sanitized[field] instanceof Array) )
			throw new Error(
				'Scraping function returned data.'+field+', '+
				'but its not an array.');
	});

	// sanitize the items
	sanitized.items = sanitized.items.map( function(item) {

		// remove empty properties
		item = _.pick(item, _.identity);

		_.each(item, function(value, key) {
			if ( typeof value === 'string' ) {
				item[key] = item[key]
					//.replace(/^\s+|\s+$/g, '') // remove newlines from string edges
					.trim();
			}
		});

		return item;
	});

	return sanitized;
};

// error handler
Spider.prototype.error = function(error) {
	if ( typeof error === 'string' ) {
		error = 'Spider: '+error;
		error += ' (Iteration: '+this.iteration+')';
		error += this.url ? ' (URL: '+this.url+')' : '';
		error = new Error(error);
	}

	this.stopPhantom();
	this.emit('error', error);
};

// todo: organize this
function Page(url, html) {
	this.html = html;
	this.location = {
		href: url,
	};
}

Page.prototype.evaluate = function(func, callback) {
	var $ = cheerio.load(this.html);
	callback(func.call(this, $));
};