var testDatabase = require('./util/database');
var db = require('../').db(testDatabase.url);
var Transaction = require('../').transaction(db);
var EventEmitter = require('events').EventEmitter;

var should = require('chai').should();



var transaction, User, rootUserId, userData;


describe("transaction", function(){
  // before(testDatabase.refreshDb);
  // after(testDatabase.stopDb);
  it("should begin a transaction", function(done){
    Transaction.begin(function(err, response){
      should.exist(Transaction._commit);
      Transaction._statements.should.be.an('array').with.length(0);
      Transaction.commit(function(err2, response2){
        //test the begin
        should.not.exist(err);
        should.exist(response);
        response.length.should.be.equal(0);

        //test the commit
        should.not.exist(err2);
        should.not.exist(Transaction._commit);
        Transaction._statements.should.be.an('array').with.length(0);
        should.exist(response2);
        response2.length.should.be.equal(0);
        done();
      });
    });
  });
  it("should begin a Transaction: with string statement", function(done){
    var statement = 'CREATE n:User RETURN id(n)';
    Transaction.begin(statement, function(err, response){
      should.exist(Transaction._commit);
      Transaction._appliedStatements.should.be.an('array').with.length(1);
      Transaction.commit(function(err2, response2){
        //test teh begin
        should.not.exist(err);
        should.exist(response);
        response.length.should.be.equal(1);
        response[0].columns[0].should.be.equal('id(n)');
        response[0].data[0].row[0].should.be.a('number');

        //test the commit
        should.not.exist(err2);
        should.not.exist(Transaction._commit);
        Transaction._statements.should.be.an('array').with.length(0);
        should.exist(response2);
        response2.length.should.be.equal(0);
        done();
      });
    });
  });
  it("should begin a Transaction: with object statement", function(done){
    var statement = {
      statement: 'CREATE n:User RETURN id(n)'
    };
    Transaction.begin(statement, function(err, response){
      should.exist(Transaction._commit);
      Transaction._appliedStatements.should.be.an('array').with.length(1);
      Transaction.commit(function(err2, response2){
        // test the begin
        should.not.exist(err);
        should.exist(response);
        response.length.should.be.equal(1);
        response[0].columns[0].should.be.equal('id(n)');
        response[0].data[0].row[0].should.be.a('number');

        //test the commit
        should.not.exist(err2);
        should.not.exist(Transaction._commit);
        Transaction._statements.should.be.an('array').with.length(0);
        should.exist(response2);
        response2.length.should.be.equal(0);
        done();
      });
    });
  });
  it("should error if trying to open a second transaction", function(){
    // Add your behavior testing code here
  });
});