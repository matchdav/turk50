/*
 * mTurk50 - a port of the Turk50 class.  Provides access to all methods in the latest WSDL.  
 *
 * Copyright (c) 2013 Cognilab
 * Author: Matthew Davidson
 * Licensed under the MIT license.
 */

'use strict';
function capitalize(string)
{
    return string.charAt(0).toUpperCase() + string.slice(1);
}
var soap = require('soap');
var crypto = require('crypto');
var signature = require('./signature');
var util = require('util');
var timestamp = require('./timestamp');
var events = require('events');

var settings = {
  sandbox:true,
  AWSAccessKeyId:false,
  AWSSecretAccessKeyId:false
}

var PRODUCTION = 'https://mechanicalturk.amazonaws.com/';
var SANDBOX = 'https://mechanicalturk.sandbox.amazonaws.com/';
var WSDL = 'https://mechanicalturk.amazonaws.com/AWSMechanicalTurk/AWSMechanicalTurkRequester.wsdl';
var SERVICE = 'AWSMechanicalTurkRequester';

function turkClient(config)
{
	if(this instanceof turkClient) return new turkClient(config);
	events.EventEmitter.call(this);
	this.settings = settings;
	this.ready = false;
	this.initialize(config);
}


util.inherits(turkClient, events.EventEmitter);

turkClient.prototype.setSandbox = function(sandbox){
	this.sandbox = sandbox;
	if(this.client){
		var endpoint = this.sandbox ? SANDBOX : PRODUCTION;
		this.client.setEndpoint(endpoint);
	}
	return this;
};

turkClient.prototype.initialize = function(args)
{
	
	this.settings = util.extend({},settings,args);
	this.sandbox = this.settings.sandbox;
	var _this = this;
	if(this.ready)
	{
		return this.emit('ready')
	}

	soap.createClient(WSDL,function(error, client){
		_this.client = client;
		if(_this.client){
			if(_this.sandbox)
				_this.client.setEndpoint(SANDBOX);
			else
				_this.client.setEndpoint(PRODUCTION);
			for(var key in client){
				if(client[key] instanceof Function){
					_this[key] = function(args, cb){
						if(!args.OperationRequest)
							args.OperationRequest = capitalize(key);
						_this.makeRequest(args, cb)
					};
				}
			}
			_this.ready = true;
			_this.emit('ready');
		}
	});
};

turkClient.prototype.makeRequest = function(args, callback)
{
	if(!this.settings.AWSAccessKeyId || !this.settings.AWSSecretAccessKeyId)
	{
		return callback(new Error('Please set the AWSAccessKeyId and AWSSecretAccessKeyId using the config() method.'))
	}
	if(!args || !args.Operation)
	{
 		return callback(new Error('You need to pass an Operation argument to the requester.'));
	}
	var AWSAccessKeyId = this.settings['AWSAccessKeyId'], 
		AWSSecretAccessKeyId = this.settings['AWSSecretAccessKeyId'], 
		ts = new Date().toISOString(), 
		Operation = args.Operation, 
		sig = signature(AWSSecretAccessKeyId,SERVICE, Operation, ts), 
		base_args = {
			'Service':SERVICE,
			'AWSAccessKeyId':AWSAccessKeyId,
			'AWSSecretAccessKeyId':AWSSecretAccessKeyId,
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
		//abnormal case

		if(Operation == 'CreateHIT'){
			resultKey = 'HIT';
		}
		var result = response && response[resultKey] ? response[resultKey].pop() : response;
		if(!(result && result.Request 
			&& result.Request.IsValid && result.Request.IsValid.toLowerCase() == 'true')){
			error = response; // What to put here?
		}
		console.log(result);
		callback(error, result);
		
	});
	return this;
};

turkClient.prototype.config = function(args){
	this.settings = util.extend({},settings,args);
	//enable chaining.
	return this;
};

//curry it.

exports = module.exports = function(config){
	return new turkClient(config);
};