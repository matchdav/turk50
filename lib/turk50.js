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
var soap = require("soap");
var crypto = require("crypto");
var _ = require("underscore");
var signature = require("./signature");
var util = require("util");
var timestamp = require('./timestamp');
var events = require("events");

var settings = {
  sandbox:true,
  AWSAccessKeyId:false,
  AWSSecretAccessKeyId:false
}

var PRODUCTION = "https://mechanicalturk.amazonaws.com/";
var SANDBOX = "https://mechanicalturk.sandbox.amazonaws.com/";
var WSDL = "https://mechanicalturk.amazonaws.com/AWSMechanicalTurk/AWSMechanicalTurkRequester.wsdl";
var SERVICE = "AWSMechanicalTurkRequester";

function turkClient(config)
{
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
}
turkClient.prototype.initialize = function(args)
{
	
	this.settings = _.extend({},settings,args);
	this.sandbox = this.settings.sandbox;
	var self = this;
	if(this.ready)
	{
		console.log('ready,',this.settings);
		return this.emit('ready')
	}

	soap.createClient(WSDL,function(error, client){
		self.client = client;
		if(self.client){
			if(self.sandbox)
				self.client.setEndpoint(SANDBOX);
			else
				self.client.setEndpoint(PRODUCTION);
			for(var key in client){
				if(client[key] instanceof Function){
					
					//create a convenience method. 
					
					self[key] = function(args, cb){
						if(!args.OperationRequest)
							args.OperationRequest = capitalize(key);
						self.makeRequest(args, cb)
					};
				}

			}
			self.ready = true;
			self.emit('ready');
		}
		
		
	});
}

turkClient.prototype.makeRequest = function(args, callback)
{
	// console.log("Settings",this.settings);
	// console.log('Sandbox:',this.sandbox);
	if(!this.settings.AWSAccessKeyId || !this.settings.AWSSecretAccessKeyId)
	{
		return callback(new Error("Please set the AWSAccessKeyId and AWSSecretAccessKeyId using the config() method."))
	}
	if(!args || !args.Operation)
	{
 		return callback(new Error("You need to pass an Operation argument to the requester."));
	}
	var AWSAccessKeyId = this.settings['AWSAccessKeyId']
	, AWSSecretAccessKeyId = this.settings["AWSSecretAccessKeyId"]
	, ts = new Date().toISOString()
	, Operation = args.Operation
	, sig = signature(AWSSecretAccessKeyId,SERVICE, Operation, ts)
	, base_args = {
		"Service":SERVICE,
		"AWSAccessKeyId":AWSAccessKeyId,
		"AWSSecretAccessKeyId":AWSSecretAccessKeyId,
		"Signature":sig,
		"Timestamp":ts
	}
	, $args = base_args;
	
	$args.Request = [args];
	if(this.sandbox){
		this.client.setEndpoint(SANDBOX);
	}
	else {
		this.client.setEndpoint(PRODUCTION);
	}

	this.client[Operation]($args,function(error, response){
		var resultKey = Operation + "Result";
		//abnormal case

		if(Operation == "CreateHIT"){
			resultKey = "HIT";
		}
		console.log(resultKey);
		var result = response && response[resultKey] ? response[resultKey].pop() : response;
		if(!(result && result.Request 
			&& result.Request.IsValid && result.Request.IsValid.toLowerCase() == "true")){
			error = response; // What to put here?
			console.log("Mturk Error");
			console.log("mturk");
		}
		console.log(result);
		callback(error, result);
		
	});
	return this;
}

turkClient.prototype.config = function(args){
	this.settings = _.extend({},settings,args);
	//enable chaining.
	return this;
}

//curry it.

exports = module.exports = function(config){
	return new turkClient(config);
};