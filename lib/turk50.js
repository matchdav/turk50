/*
 * mTurk50 - a port of the Turk50 class.  Provides access to all methods in the latest WSDL.  
 *
 * Copyright (c) 2013 Cognilab
 * Author: Matthew Davidson
 * Licensed under the MIT license.
 */

'use strict;';
function capitalize(str)
{
    return (str.charAt(0).toUpperCase() + str.slice(1));
}
var soap = require('soap');
var crypto = require('crypto');
var signature = require('./signature');
var util = require('util');
var extend = require('extend');
var timestamp = require('./timestamp');
var events = require('events');
var Promise = require('promise');
var settings = {
  sandbox:true,
  AWSAccessKeyId:false,
  AWSSecretAccessKeyId:false
};

var PRODUCTION = 'https://mechanicalturk.amazonaws.com/';
var SANDBOX = 'https://mechanicalturk.sandbox.amazonaws.com/';
var WSDL = 'https://mechanicalturk.amazonaws.com/AWSMechanicalTurk/AWSMechanicalTurkRequester.wsdl';
var SERVICE = 'AWSMechanicalTurkRequester';


/**
 * The turk client constructor
 * @param  {Object} config AWS key and 
 * @return {[type]}        [description]
 */

function turkClient(config)
{

	if(!this instanceof turkClient) return new turkClient(config);
	events.EventEmitter.call(this);
	this.ready = false;
	this.initialize(config);
}


util.inherits(turkClient, events.EventEmitter);

/**
 * Set config flag and, if the client is initialized, set the endpoint.
 * @param {Boolean} sandbox 
 */
turkClient.prototype.setSandbox = function(sandbox){

	var endpoint;

	this.sandbox = sandbox;
	endpoint = this.sandbox ? SANDBOX : PRODUCTION;

	if(this.client){
		this.client.setEndpoint(endpoint);
	}

	return this;
};



turkClient.prototype.initialize = function (args) {	

	var _this = this;

	this.config(args);

	if(this.ready) return _this.emit('ready');

	soap.createClient(WSDL,function(error, client){
		_this.client = client;
		if(error) return new Error(error);
		if(_this.client){
			_this.setSandbox(_this.sandbox);
			
			_this.ready = true;
			_this.emit('ready');
		}
	});
};


turkClient.prototype.makeRequest = function (args, callback)
{
	console.log('making request',args, this.key(), this.secret());

	if(!this.key() || ! this.secret())
	{
		return callback(new Error('Please set the AWSAccessKeyId and AWSSecretAccessKeyId using the config() method.'))
	}

	if(!args || !args.Operation)
	{
 		return callback(new Error('You need to pass an Operation argument to the requester.'));
	}

	var ts = new Date().toISOString(), 
		Operation = args.Operation, 
		sig = signature(this.secret(),SERVICE, Operation, ts), 
		base_args = {
			'Service':SERVICE,
			'AWSAccessKeyId':this.key(),
			'AWSSecretAccessKeyId':this.secret(),
			'Signature':sig,
			'Timestamp':ts
		}, 
		parameters = base_args;
	
	parameters.Request = [args];

	if(this.sandbox){
		this.client.setEndpoint(SANDBOX);
	}
	else {
		this.client.setEndpoint(PRODUCTION);
	}

	this.client[Operation](parameters,function(error, response){

		var resultKey = Operation + 'Result';
		if(Operation == 'CreateHIT'){
			resultKey = 'HIT';
		}
		var result = response && response[resultKey] ? response[resultKey].pop() : response;
		if(!(result && result.Request && 
			result.Request.IsValid && result.Request.IsValid.toLowerCase() == 'true')){

			return callback(new Error(result)); // What to put here?
		} else {
			callback(null, result);
		}
		
	});
};


 turkClient.prototype.request = function(operation,args,callback){
 	var _this = this;
 	var fn;

 	fn = callback;
 	
 	if(arguments.length < 3 && args && typeof args == 'function') {
 		fn = args; 
 		args = {Operation:operation};
 	} else if(!args) {
 		args = {Operation:operation};
 	} else {
 		args.Operation = operation;
 	}

 	if(!fn) {
 		return new Promise(function(fulfill,reject){
	 		_this.makeRequest(args,function(err, result){
	 			if(err) reject(err);
	 			else fulfill(result);
	 		});
	 	});
 	} else {
 		_this.makeRequest(args,fn);
 	}
 	return this;
 }


turkClient.prototype.config = function(args){
	this.settings = extend({},settings,args);
	this.sandbox = args.sandbox;
	return this;
};

turkClient.prototype.key = function () {
	return this.settings.AWSAccessKeyId;
};

turkClient.prototype.secret = function () {
	return this.settings.AWSSecretAccessKeyId;
};

exports = module.exports = function(config){
	return new turkClient(config);
};