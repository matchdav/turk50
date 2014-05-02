var Turk = require('..'),
	should = require('should'),
	config = require(process.cwd()+'/config'),
	turk = new Turk(config);

describe('Turk',function(){
	it('should exist',function(){
		should.exist(Turk);
		should.exist(turk);
	});
});

describe('turk',function(){
	before(function(done){
		this.timeout(6000)
		turk.on('ready',done);
	});
	it('should exist',function(){
		should.exist(turk);
	});
	it('#request-SearchHITs',function(done){
		turk.request('SearchHITs',function(err, res, xml){
			res.should.exist;
			done();
		});
	});
	it('request-SearchHITs, promiseified',function(done){
		this.timeout(5000);
		turk.request('SearchHITs').then(function(err, res, xml){
			console.log('done with ',arguments)
			done();
		});
	});

});